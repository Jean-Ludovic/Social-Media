#!/usr/bin/env node
// Deploys a backend image (already pushed to ECR) to the Lightsail container service.
//
//   node deploy/lightsail/deploy-backend.mjs <image-tag> [--dry-run]
//
// Configuration and secrets are read from SSM Parameter Store at deploy time and handed to
// Lightsail in memory: they are never printed, written to disk, or stored in this repository.
// --dry-run prints the deployment with every secret masked and calls nothing that changes state.
//
// Environment overrides: AWS_CLI (path to aws), AWS_PROFILE_NAME, AWS_REGION_NAME, SERVICE_NAME.
import { spawnSync } from 'node:child_process';

const AWS_CLI = process.env.AWS_CLI || 'aws';
const PROFILE = process.env.AWS_PROFILE_NAME || 'social-media-staging';
const REGION = process.env.AWS_REGION_NAME || 'ca-central-1';
const SERVICE = process.env.SERVICE_NAME || 'social-media-staging-api';
const SSM_PATH = '/social-media/staging';
const REPOSITORY = 'social-media/backend';
const CONTAINER = 'api';
const PORT = 3000;

// Runtime needs these; DIRECT_URL is deliberately absent (migrations only).
const REQUIRED = ['NODE_ENV', 'PORT', 'JWT_EXPIRES_IN', 'DATABASE_URL', 'JWT_SECRET'];
const OPTIONAL = ['CORS_ORIGIN'];
const SECRET = new Set(['DATABASE_URL', 'JWT_SECRET']);

const [tag, ...flags] = process.argv.slice(2);
const dryRun = flags.includes('--dry-run');
if (!tag || !/^staging-[0-9a-f]{7,40}$/.test(tag)) {
  console.error('Usage: node deploy/lightsail/deploy-backend.mjs staging-<git-sha> [--dry-run]');
  process.exit(1);
}

function aws(args, { sensitive = [] } = {}) {
  const res = spawnSync(AWS_CLI, [...args, '--profile', PROFILE, '--region', REGION, '--output', 'json'], {
    encoding: 'utf8',
    env: { ...process.env, MSYS_NO_PATHCONV: '1' },
  });
  if (res.status !== 0) {
    let err = (res.stderr || res.stdout || '').trim();
    for (const s of sensitive) if (s) err = err.split(s).join('***');
    throw new Error(`aws ${args.slice(0, 2).join(' ')} failed: ${err.slice(0, 400)}`);
  }
  return res.stdout ? JSON.parse(res.stdout) : {};
}

const account = aws(['sts', 'get-caller-identity']).Account;
const image = `${account}.dkr.ecr.${REGION}.amazonaws.com/${REPOSITORY}:${tag}`;

// The image must already exist in ECR (tags are immutable, so this pins the exact digest).
const ecrImage = aws(['ecr', 'describe-images', '--repository-name', REPOSITORY, '--image-ids', `imageTag=${tag}`]).imageDetails[0];

const params = aws(['ssm', 'get-parameters-by-path', '--path', SSM_PATH, '--with-decryption']).Parameters;
const values = Object.fromEntries(params.map((p) => [p.Name.slice(SSM_PATH.length + 1), p.Value]));
const missing = REQUIRED.filter((k) => !values[k]);
if (missing.length) throw new Error(`Missing SSM parameters under ${SSM_PATH}: ${missing.join(', ')}`);
if (values.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');

const environment = Object.fromEntries([...REQUIRED, ...OPTIONAL].filter((k) => values[k]).map((k) => [k, values[k]]));
const containers = {
  [CONTAINER]: { image, environment, ports: { [String(PORT)]: 'HTTP' } },
};
const publicEndpoint = {
  containerName: CONTAINER,
  containerPort: PORT,
  healthCheck: {
    path: '/api/health/live',
    successCodes: '200',
    intervalSeconds: 10,
    timeoutSeconds: 5,
    healthyThreshold: 2,
    unhealthyThreshold: 3,
  },
};

const masked = JSON.parse(JSON.stringify(containers));
for (const k of Object.keys(masked[CONTAINER].environment)) {
  if (SECRET.has(k)) masked[CONTAINER].environment[k] = `*** (${values[k].length} chars, from SSM)`;
}
console.log(`Service     : ${SERVICE} (${REGION})`);
console.log(`Image       : ${image}`);
console.log(`Digest ECR  : ${ecrImage.imageDigest}`);
console.log(`Containers  : ${JSON.stringify(masked, null, 2)}`);
console.log(`Endpoint    : ${JSON.stringify(publicEndpoint, null, 2)}`);
if (!values.CORS_ORIGIN) console.log('Note        : CORS_ORIGIN not set yet (backend falls back to http://localhost:4200)');

if (dryRun) {
  console.log('\nDry run: nothing deployed.');
  process.exit(0);
}

const secretValues = [...SECRET].map((k) => values[k]);
const res = aws(
  [
    'lightsail', 'create-container-service-deployment',
    '--service-name', SERVICE,
    '--containers', JSON.stringify(containers),
    '--public-endpoint', JSON.stringify(publicEndpoint),
  ],
  { sensitive: secretValues },
);
const svc = res.containerService;
console.log(`\nDeployment requested: service state=${svc.state}, next deployment version=${svc.nextDeployment?.version ?? '?'}`);
console.log(`Public URL : ${svc.url}`);
