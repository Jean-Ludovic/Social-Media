# Déploiement AWS — Staging

> Dernière mise à jour : 2026-09-29
> Aucun secret réel ne doit figurer dans ce document ni dans le dépôt.

---

## 0. État actuel

| Élément | État |
|---|---|
| Compte / identité | `466217810694`, IAM Identity Center, profil CLI `social-media-staging` (aucune clé longue durée) |
| Région applicative | `ca-central-1` (même région que le pooler Supabase) |
| ECR `social-media/backend` | ✅ créé — tags immuables, scan au push, conservation des 5 dernières images |
| Image `staging-f01127a` | ✅ poussée — digest `sha256:d34594b1…6709a8`, `linux/amd64`, ~186 Mo compressés |
| Paramètres SSM `/social-media/staging/*` | ✅ créés (voir § 3) — `CORS_ORIGIN` pas encore |
| Service Lightsail `social-media-staging-api` | ⏸️ **non créé** — en attente d'accord (première ressource facturée) |
| S3 / CloudFront / domaine | ⏸️ phase suivante |
| Budget AWS | ⏸️ en attente de l'adresse email d'alerte |

### Pourquoi pas App Runner

App Runner n'existe pas en `ca-central-1` et **n'accepte plus de nouveaux clients depuis le
30 avril 2026** (service en maintenance). Le successeur recommandé par AWS, ECS Express Mode,
impose un Application Load Balancer (≈ 41 $/mois au total en `ca-central-1`), trop cher pour ce staging.

---

## 1. Architecture

```
                 https://<distribution>.cloudfront.net  (domaine personnalisé plus tard)
                                   │
                            ┌──────▼───────┐
                            │  CloudFront  │
                            └──┬────────┬──┘
       behavior par défaut (*) │        │ behavior /api/*  (pas de cache)
       + fonction spa-fallback │        │
                          ┌────▼───┐ ┌──▼──────────────────────────────┐
                          │ S3     │ │ Lightsail Containers « Nano »   │
                          │ privé  │ │ 0,25 vCPU / 0,5 Go, ca-central-1│
                          │ (OAC)  │ │ image tirée d'ECR privé         │
                          └────────┘ └──┬──────────────────────────────┘
                                        │ DATABASE_URL (pooler transaction :6543)
                                 ┌──────▼──────────────┐
                                 │ Supabase PostgreSQL │  ca-central-1, hors AWS
                                 └─────────────────────┘
```

- **Un seul domaine public** : le navigateur appelle `/api/...` sur la même origine que la SPA
  (`apiUrl: '/api'`).
- Lightsail fournit une URL HTTPS stable (`https://<service>.<id>.ca-central-1.cs.amazonlightsail.com`),
  utilisée comme origine CloudFront.
- Dimensionnement mesuré : ≈ 100 Mo de RAM sous 0,25 vCPU / 512 Mo, démarrage 3–5 s.

---

## 2. Composants AWS

| Composant | Rôle | Coût |
|---|---|---|
| ECR `social-media/backend` | Images backend (`staging-<sha>`) | < 0,10 $/mois |
| SSM Parameter Store | Source de vérité de la configuration et des secrets | 0 $ (paramètres standard, clé `alias/aws/ssm`) |
| Lightsail Container Service `social-media-staging-api` | Exécution du backend (1 nœud Nano) | 7 $/mois fixe |
| Rôle « ECR image puller » Lightsail | Géré par Lightsail, autorisé dans la politique du dépôt ECR | 0 $ |
| S3 privé + CloudFront + fonction `spa-fallback` | Frontend et point d'entrée unique | ≈ 0 $ (niveau gratuit) |
| AWS Budgets | Alertes de coût | 0 $ |

---

## 3. Configuration et secrets

Tout est dans **SSM Parameter Store**, sous `/social-media/staging/` :

| Paramètre | Type | Injecté dans le conteneur | Remarque |
|---|---|---|---|
| `DATABASE_URL` | SecureString | ✅ | pooler Supabase transaction `:6543` |
| `DIRECT_URL` | SecureString | ❌ | pooler session `:5432`, **uniquement pour les migrations** |
| `JWT_SECRET` | SecureString | ✅ | 64 caractères aléatoires, propre au staging, jamais affiché |
| `NODE_ENV` | String | ✅ | `production` |
| `PORT` | String | ✅ | `3000` |
| `JWT_EXPIRES_IN` | String | ✅ | `7d` |
| `CORS_ORIGIN` | String | ✅ quand il existera | à créer avec l'URL CloudFront (§ 8) |

**Limite de Lightsail** : il ne lit pas SSM nativement. Le script de déploiement lit SSM et transmet
les valeurs à Lightsail en mémoire ; elles sont alors stockées dans la configuration du service et
lisibles par un administrateur du compte (API `get-container-services`). Acceptable pour le staging ;
la production devra utiliser un service qui référence SSM directement (ECS).

Ne jamais afficher ni écrire ces valeurs. Pour relire une valeur, préférer une comparaison en
mémoire à un affichage.

---

## 4. Image backend

`backend/Dockerfile` — multi-stage, base `node:24-bookworm-slim` :

| Stage | Contenu |
|---|---|
| `build` | `npm ci` → `prisma generate` (URL factice, jamais contactée) → `nest build` |
| `migrate` | CLI Prisma + migrations ; commande `npm run migrate:deploy` |
| `prod-deps` | `npm prune --omit=dev` (conserve le client Prisma généré) |
| `runtime` (défaut) | `node_modules` + `dist/` + `package.json`, utilisateur `node`, `CMD node dist/main.js` |

Prisma 7 + `@prisma/adapter-pg` : pas de moteur natif au runtime (compilateur de requêtes WASM).
L'image `migrate` contient un schema engine lié statiquement (TLS intégré) : l'avertissement
« failed to detect the libssl/openssl version » est cosmétique — `migrate status` vers Supabase a été
vérifié depuis cette image.

Construire et pousser (tag = SHA Git court, jamais `latest`) :

```bash
SHA=$(git rev-parse --short HEAD)
docker build --provenance=false --sbom=false --platform linux/amd64 -t social-media-backend:staging-$SHA ./backend
aws ecr get-login-password --profile social-media-staging --region ca-central-1 \
  | docker login --username AWS --password-stdin 466217810694.dkr.ecr.ca-central-1.amazonaws.com
docker tag social-media-backend:staging-$SHA 466217810694.dkr.ecr.ca-central-1.amazonaws.com/social-media/backend:staging-$SHA
docker push 466217810694.dkr.ecr.ca-central-1.amazonaws.com/social-media/backend:staging-$SHA
```

`--provenance=false --sbom=false` produit un manifeste d'image simple (sans index d'attestations).

**Scan ECR de `staging-f01127a`** : 3 CRITICAL, 12 HIGH, 6 MEDIUM, 2 LOW — tous dans des paquets
système Debian de l'image de base (`perl`, `util-linux`, `zlib`), pas dans l'application.
Le scan basique ne couvre pas les dépendances npm. À traiter avant la production (image de base
plus récente ou plus minimale, puis revalidation complète).

---

## 5. Migrations Prisma

- **Jamais** `prisma migrate dev` hors du poste de développement.
- Le conteneur runtime ne migre jamais au démarrage.
- Vérifier avant toute release (lecture seule) :
  ```bash
  docker run --rm -e DIRECT_URL social-media-backend:migrate npx --no-install prisma migrate status
  ```
- Appliquer, uniquement si nécessaire et **après accord explicite** :
  ```bash
  docker run --rm -e DIRECT_URL social-media-backend:migrate     # CMD = npm run migrate:deploy
  ```
  `DIRECT_URL` est transmise par héritage d'environnement (valeur lue depuis SSM ou `.env`,
  jamais écrite dans une commande). Supabase étant public, cela se fait depuis le poste ou la CI.
- Déployer ensuite la nouvelle image. Chaque migration doit rester compatible avec la version
  précédente, qui tourne encore pendant la migration.

---

## 6. Lightsail — création et déploiement

Création du service (**facturation à partir de cette étape : 7 $/mois**) :

```bash
aws lightsail create-container-service --profile social-media-staging --region ca-central-1 \
  --service-name social-media-staging-api --power nano --scale 1 \
  --private-registry-access ecrImagePullerRole={isActive=true} \
  --tags key=project,value=social-media key=environment,value=staging
```

Quand le service est `READY`, récupérer l'ARN du rôle de pull et l'autoriser sur le dépôt ECR :

```bash
aws lightsail get-container-services --profile social-media-staging --region ca-central-1 \
  --service-name social-media-staging-api \
  --query 'containerServices[0].privateRegistryAccess.ecrImagePullerRole.principalArn'
# politique du dépôt : ecr:BatchGetImage + ecr:GetDownloadUrlForLayer pour ce principalArn
```

Déployer une image (config lue depuis SSM, secrets jamais affichés) :

```bash
node deploy/lightsail/deploy-backend.mjs staging-<sha> --dry-run   # affiche la config, secrets masqués
node deploy/lightsail/deploy-backend.mjs staging-<sha>
```

Le script vérifie que l'image existe dans ECR, que les paramètres requis existent et que
`JWT_SECRET` fait au moins 32 caractères. Configuration déployée :

| Réglage | Valeur |
|---|---|
| Conteneur | `api`, port `3000` (HTTP) |
| Variables | `NODE_ENV`, `PORT`, `JWT_EXPIRES_IN`, `DATABASE_URL`, `JWT_SECRET` (+ `CORS_ORIGIN` s'il existe) |
| Endpoint public | conteneur `api:3000` |
| Health check | `GET /api/health/live`, code `200`, intervalle 10 s, timeout 5 s, 2 succès / 3 échecs |

Lightsail n'active la nouvelle version que si le health check passe ; sinon l'ancienne reste en service.

---

## 7. Health checks

| Endpoint | Vérifie | Usage |
|---|---|---|
| `GET /api/health/live` | Le processus répond (aucune requête SQL) | **Health check Lightsail** |
| `GET /api/health` | Processus **et** PostgreSQL — 503 si la base est injoignable | Smoke tests, supervision |

Une indisponibilité de Supabase (par exemple la mise en pause d'un projet gratuit) ne doit pas
faire échouer les déploiements ni redémarrer des conteneurs sains : le backend démarre même sans base.

---

## 8. CloudFront, S3 et CORS (phase suivante)

**Origines** : S3 privé via Origin Access Control ; Lightsail (URL HTTPS du service, protocole HTTPS only).

| Chemin | Origine | Méthodes | Cache policy | Origin request policy | Fonction |
|---|---|---|---|---|---|
| `/api/*` | Lightsail | toutes | `Managed-CachingDisabled` | `Managed-AllViewerExceptHostHeader` | — |
| `*` (défaut) | S3 | GET, HEAD | `Managed-CachingOptimized` | — | `spa-fallback` (viewer-request) |

- `AllViewerExceptHostHeader` : l'origine reçoit son propre nom d'hôte, pas celui de CloudFront.
- Vérifier que l'en-tête `Authorization` atteint le backend (smoke test n° 4, § 10).
- **Pas** de « Custom error responses » CloudFront : elles transformeraient les erreurs de l'API en HTML 200.
- `deploy/cloudfront/spa-fallback.js` réécrit toute URI sans extension en `/index.html`.

Upload du frontend :

```bash
npx ng build --configuration staging        # dans frontend/
aws s3 sync dist/reseau-social/browser s3://<bucket> --exclude index.html \
  --cache-control "public,max-age=31536000,immutable"
aws s3 cp dist/reseau-social/browser/index.html s3://<bucket>/index.html --cache-control "no-cache"
aws cloudfront create-invalidation --distribution-id <id> --paths "/index.html"
```

**CORS** : même origine, donc sans effet pour l'application. Une fois l'URL CloudFront connue :

```bash
aws ssm put-parameter --profile social-media-staging --region ca-central-1 \
  --name /social-media/staging/CORS_ORIGIN --type String --value "https://<distribution>.cloudfront.net"
node deploy/lightsail/deploy-backend.mjs staging-<sha>     # redéploiement pour prendre la valeur
```

---

## 9. Logs

- Logs du conteneur dans Lightsail (console ou `aws lightsail get-container-log`), pas dans CloudWatch.
- Vérifié : aucun secret dans les logs (démarrage et requêtes).
- Arrêt propre sur `SIGTERM` (`enableShutdownHooks`, déconnexion Prisma).

---

## 10. Ordre de mise en place

1. ✅ ECR, image `staging-f01127a`, scan.
2. ✅ Paramètres SSM (sauf `CORS_ORIGIN`).
3. ✅ `prisma migrate status` depuis l'image `migrate` : base à jour.
4. ⏸️ Budget AWS (email d'alerte requis) — 15 $/mois, alertes 50 / 80 / 100 % + prévision 100 %.
5. ⏸️ Service Lightsail + politique ECR + premier déploiement (§ 6).
6. ⏸️ Tests sur l'URL Lightsail directe : `/api/health/live`, `/api/health`, login, `/api/debates`.
7. S3 privé, fonction CloudFront, distribution CloudFront.
8. `CORS_ORIGIN` + redéploiement ; build et upload du frontend.
9. Smoke tests :
   1. `GET /api/health/live` → 200 ; `GET /api/health` → 200, `database: "up"`
   2. `GET /` et `GET /feed` (ouverture directe) → page Angular
   3. `GET /api/nimporte` → **404 JSON** (et non `index.html`)
   4. Login puis `GET /api/users/me` → 200 (l'en-tête `Authorization` traverse CloudFront)
   5. Parcours : feed, débats, messages, notifications ; rafraîchir `/debates/<id>`
10. Plus tard : domaine personnalisé, certificat ACM (`us-east-1`), DNS.

---

## 11. Coûts (USD/mois, tarifs AWS Pricing `ca-central-1`, septembre 2026)

| Poste | Estimation |
|---|---|
| Lightsail Nano (1 nœud) | 7,00 $ |
| ECR (≤ 5 images, 0,10 $/Go-mois) | < 0,10 $ |
| SSM Parameter Store (standard) | 0 $ |
| S3 + CloudFront (+ fonction) | ≈ 0 $ (niveau gratuit) |
| Budgets | 0 $ |
| **Total AWS** | **≈ 7 – 8 $** |
| Route 53 (optionnel, plus tard) | 0,50 $/zone + domaine |
| Supabase (hors AWS) | 0 $ (mise en pause possible) ou 25 $ (Pro) |

Pour comparaison : ECS Express Mode ≈ 41 $/mois (Fargate ≈ 9,90 $ + ALB ≈ 20 $ + IPv4 publiques ≈ 11 $).

---

## 12. Retour arrière

| Élément | Retour arrière |
|---|---|
| Backend | `node deploy/lightsail/deploy-backend.mjs staging-<sha précédent>` (tags immuables, 5 images conservées) |
| Frontend | Ré-uploader le build précédent, invalider `/index.html` |
| Base de données | Pas de retour arrière automatique : correction par une nouvelle migration (§ 5) |
| Tout le staging | Supprimer le service Lightsail arrête la facturation principale |

---

## 13. Points ouverts

1. Adresse email des alertes budgétaires.
2. Vulnérabilités de l'image de base (§ 4) avant la production.
3. Stockage des secrets dans la configuration Lightsail (§ 3) : à revoir pour la production.
4. Plan Supabase : le plan gratuit met le projet en pause (staging indisponible).
5. Domaine personnalisé et DNS.
6. L'URL Lightsail directe reste publique et contourne CloudFront ; à restreindre avant la production.
