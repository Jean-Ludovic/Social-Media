# syntax=docker/dockerfile:1
#
# Targets:
#   docker build -t social-backend .                     -> runtime image (default, last stage)
#   docker build --target migrate -t social-migrate .    -> one-off `prisma migrate deploy` image
#
# No secret is baked into any stage: DATABASE_URL, DIRECT_URL and JWT_SECRET are injected at run time.

ARG NODE_VERSION=24-bookworm-slim

# ---------- build: full dependencies, Prisma client generation, Nest compilation ----------
FROM node:${NODE_VERSION} AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json tsconfig.build.json nest-cli.json ./
# Prisma 7 + driver adapter: generates the JS client and its WASM query compiler into
# node_modules/.prisma/client. No native engine binary, no database connection needed.
# prisma.config.ts uses env('DIRECT_URL'), which throws when unset, even for `generate`:
# a dummy URL is passed to this single command only (not persisted, never contacted).
RUN DIRECT_URL="postgresql://build:build@localhost:5432/build" npx prisma generate

COPY src ./src
RUN npm run build

# ---------- migrate: one-off release task, never run automatically at container start ----------
FROM build AS migrate
ENV NODE_ENV=production
USER node
CMD ["npm", "run", "migrate:deploy"]

# ---------- prod-deps: runtime node_modules only, keeping the generated Prisma client ----------
FROM build AS prod-deps
RUN npm prune --omit=dev

# ---------- runtime ----------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

USER node
EXPOSE 3000

# Same command as `npm run start:prod`, but with node as PID 1 so SIGTERM reaches Nest directly.
CMD ["node", "dist/main.js"]
