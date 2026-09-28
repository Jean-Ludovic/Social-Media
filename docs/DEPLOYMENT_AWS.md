# Déploiement AWS — Staging

> Dernière mise à jour : 2026-09-28
> Statut : **préparation uniquement** — aucune ressource AWS n'est encore créée.
> Aucun secret réel ne doit figurer dans ce document ni dans le dépôt.

---

## 1. Architecture

```
                    https://staging.<domaine>
                               │
                        ┌──────▼───────┐
                        │  CloudFront  │  certificat ACM (us-east-1)
                        └──┬────────┬──┘
          behavior par défaut│        │ behavior /api/*
          (*)                │        │ (pas de cache)
     CloudFront Function     │        │
     spa-fallback (viewer-   │        │
     request)                │        │
                        ┌────▼───┐ ┌──▼──────────────────┐
                        │ S3     │ │ AWS App Runner      │
                        │ privé  │ │ conteneur NestJS    │
                        │ (OAC)  │ │ port 3000           │
                        └────────┘ └──┬──────────────────┘
                                      │ DATABASE_URL (pooler transaction :6543)
                               ┌──────▼───────────────────┐
                               │ Supabase PostgreSQL      │  (hors AWS)
                               └──────────────────────────┘
```

- **Un seul domaine public** : le navigateur appelle `/api/...` sur la même origine que la SPA
  (`apiUrl: '/api'` dans `environment.prod.ts` et `environment.staging.ts`).
- **Base de données** : reste sur Supabase. Aucune ressource réseau AWS (VPC, NAT) n'est nécessaire
  pour y accéder : App Runner sort sur Internet par défaut.

### Backend : App Runner (recommandé pour le staging) vs ECS Fargate

| Critère | App Runner | ECS Fargate |
|---|---|---|
| Mise en place | Un service : image + port + variables + health check | VPC, sous-réseaux, security groups, cluster, task definition, service, **ALB** |
| HTTPS | URL `*.awsapprunner.com` en HTTPS incluse | Via ALB + certificat ACM |
| Origine CloudFront | Directe (domaine HTTPS stable) | ALB obligatoire (l'IP d'une tâche change) |
| Déploiement | Blue/green automatique, retour arrière si le health check échoue | Rolling update géré par le service ECS |
| Migrations one-off | Pas de « run task » : exécutées depuis le poste/la CI (Supabase est public) | `aws ecs run-task` avec l'image `migrate` |
| Logs | CloudWatch automatique | CloudWatch via configuration `awslogs` |
| Secrets | Variables issues de SSM Parameter Store / Secrets Manager | Idem (task definition) |
| Coût minimal staging | ≈ 3–7 $/mois (voir § 11) | ≈ 30–40 $/mois (ALB ≈ 16 $ + IPv4 publiques + tâche) |
| Évolution | Limité (pas de sidecar, peu de contrôle réseau) | Complet : c'est la cible naturelle pour la production |

**Recommandation** : **App Runner** pour ce premier staging (le plus simple et le moins cher),
en gardant **ECS Fargate + ALB** comme cible si la production demande plus de contrôle.

> ⚠️ À vérifier avant de s'engager : la **disponibilité d'App Runner pour le compte et la région**.
> App Runner n'est pas proposé dans toutes les régions (a priori pas `ca-central-1`, où se trouve
> le pooler Supabase actuel). Chaque requête API effectuant plusieurs allers-retours SQL,
> la région du backend doit être la plus proche possible de Supabase.
> Si App Runner est indisponible ou trop éloigné, basculer sur ECS Fargate dans `ca-central-1`.

---

## 2. Composants AWS

| Composant | Rôle |
|---|---|
| ECR | Registre des images `backend` (runtime) et `backend-migrate` |
| App Runner | Exécution du conteneur NestJS |
| SSM Parameter Store (SecureString) | `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` |
| IAM | Rôle d'accès ECR pour App Runner + rôle d'instance (lecture des paramètres SSM) |
| S3 (privé) | Fichiers du build Angular |
| CloudFront + OAC | Point d'entrée HTTPS unique, cache des assets, routage `/api/*` |
| CloudFront Function | Fallback SPA (`deploy/cloudfront/spa-fallback.js`) |
| ACM (`us-east-1`) | Certificat du domaine de staging (obligatoirement us-east-1 pour CloudFront) |
| CloudWatch Logs | Logs stdout/stderr du conteneur |
| Route 53 (optionnel) | Seulement si le DNS du domaine y est hébergé |

---

## 3. Variables d'environnement du backend

| Variable | Type | Staging | Remarque |
|---|---|---|---|
| `DATABASE_URL` | **secret** | pooler Supabase transaction `:6543` | Utilisée par l'application |
| `DIRECT_URL` | **secret** | pooler Supabase session `:5432` | Utilisée **uniquement** par les migrations |
| `JWT_SECRET` | **secret** | ≥ 32 caractères aléatoires, **différent** du secret local | Aucun fallback : l'app refuse de démarrer sans |
| `JWT_EXPIRES_IN` | config | `7d` | |
| `CORS_ORIGIN` | config | `https://staging.<domaine>` | Voir § 8 |
| `PORT` | config | `3000` | Déjà défini dans l'image |
| `NODE_ENV` | config | `production` | Déjà défini dans l'image |

Générer le `JWT_SECRET` localement et le saisir **directement** dans Parameter Store
(jamais dans un fichier du dépôt, un ticket ou une conversation) :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## 4. Build du backend (conteneur)

`backend/Dockerfile` — multi-stage, image de base `node:24-bookworm-slim` :

| Stage | Contenu |
|---|---|
| `build` | `npm ci` → `prisma generate` → `nest build` |
| `migrate` | Hérite de `build` (CLI Prisma + `prisma/` + `prisma.config.ts`). Commande : `npm run migrate:deploy` |
| `prod-deps` | `npm prune --omit=dev` : dépendances runtime, en conservant le client Prisma généré |
| `runtime` (défaut) | `node_modules` élagués + `dist/` + `package.json`, utilisateur `node` (non-root), `CMD node dist/main.js` |

Points Prisma 7 :

- Avec `@prisma/adapter-pg`, **aucun moteur natif** n'est utilisé : le client généré
  (`node_modules/.prisma/client`) contient un compilateur de requêtes **WASM**. Pas de `binaryTargets`.
- L'image runtime a besoin de `node_modules/.prisma/client`, `@prisma/client`, `@prisma/adapter-pg`, `pg`.
  Elle n'a **pas** besoin de `prisma/`, `prisma.config.ts` ni de la base de données au build.
- `prisma.config.ts` utilise `env('DIRECT_URL')`, qui échoue si la variable est absente, même pour
  `prisma generate` : le Dockerfile passe une URL **factice** à cette seule commande (jamais contactée).
- `npm prune --omit=dev` conserve `prisma` et `typescript`, déclarés comme peer dependencies optionnelles
  de `@prisma/client` (≈ 378 Mo de `node_modules`). `--omit=peer` casse l'application : ne pas l'utiliser.
  Réduction de taille possible plus tard, non bloquante.

Aucun secret n'est présent dans l'image : `backend/.dockerignore` exclut `.env*` (sauf `.env.example`).

```bash
# depuis backend/
docker build -t social-backend:<git-sha> .
docker build --target migrate -t social-backend-migrate:<git-sha> .

# test local (variables lues depuis .env, jamais copiées dans l'image)
docker run --rm -p 3000:3000 --env-file .env -e JWT_SECRET -e CORS_ORIGIN=http://localhost:4200 social-backend:<git-sha>
curl http://localhost:3000/api/health/live
curl http://localhost:3000/api/health
```

---

## 5. Migrations Prisma

Règles :

- **Jamais** `prisma migrate dev` hors du poste de développement.
- **Uniquement** `npm run migrate:deploy` (= `prisma migrate deploy`), qui applique les migrations
  versionnées dans `backend/prisma/migrations/` sans en créer.
- Le conteneur runtime **ne lance jamais** les migrations au démarrage : plusieurs instances
  pourraient démarrer en même temps (déploiement blue/green, autoscaling).

Déroulé d'une release :

1. Construire les deux images (`runtime` et `migrate`) avec le même tag (SHA Git).
2. **Vérifier** l'état : `npx prisma migrate status` (lecture seule).
3. S'il y a des migrations à appliquer, les exécuter **une seule fois**, explicitement :
   ```bash
   # DIRECT_URL récupérée depuis Parameter Store au moment de l'exécution, jamais écrite sur disque
   docker run --rm -e DIRECT_URL="$(aws ssm get-parameter --name /social/staging/DIRECT_URL --with-decryption --query Parameter.Value --output text)" \
     social-backend-migrate:<git-sha>
   ```
   Supabase étant accessible publiquement, cela peut se faire depuis le poste ou la CI.
   (Avec ECS : `aws ecs run-task` utilisant l'image `migrate`.)
4. Déployer ensuite la nouvelle image runtime.

Pendant l'étape 3, l'ancienne version tourne encore : chaque migration doit rester **compatible
avec la version précédente** (ajouter avant de supprimer, en deux releases si nécessaire).

---

## 6. Frontend Angular

```bash
# depuis frontend/
npm ci
npx ng build --configuration staging     # ou production : même apiUrl '/api'
# sortie : dist/reseau-social/browser/  (index.html + fichiers hashés main-*.js, chunk-*.js, styles-*.css)
```

Upload (les fichiers hashés sont immuables, `index.html` ne doit jamais être mis en cache longtemps) :

```bash
aws s3 sync dist/reseau-social/browser s3://<bucket-staging> \
  --exclude index.html --cache-control "public,max-age=31536000,immutable"
aws s3 cp dist/reseau-social/browser/index.html s3://<bucket-staging>/index.html \
  --cache-control "no-cache"
aws cloudfront create-invalidation --distribution-id <id> --paths "/index.html"
```

Ne pas utiliser `--delete` à chaque release : un utilisateur ayant encore l'ancien `index.html`
doit pouvoir charger les anciens chunks. Nettoyer les vieux fichiers périodiquement.

---

## 7. CloudFront et routage SPA

**Origines**

| Origine | Configuration |
|---|---|
| S3 | Bucket privé (Block Public Access activé), accès via **Origin Access Control** + bucket policy limitée à la distribution |
| App Runner | Domaine `*.awsapprunner.com`, protocole **HTTPS only** |

**Behaviors (ordre de priorité)**

| Chemin | Origine | Méthodes | Cache policy | Origin request policy | Fonction |
|---|---|---|---|---|---|
| `/api/*` | App Runner | toutes (GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE) | `Managed-CachingDisabled` | `Managed-AllViewerExceptHostHeader` | aucune |
| `*` (défaut) | S3 | GET, HEAD | `Managed-CachingOptimized` | aucune | `spa-fallback` (viewer-request) |

- `AllViewerExceptHostHeader` est **indispensable** : App Runner route selon l'en-tête `Host` et doit
  recevoir son propre domaine, pas celui de CloudFront.
- L'en-tête `Authorization` (JWT) doit atteindre le backend : c'est le **smoke test n° 4** (§ 12).
- Viewer protocol policy : **Redirect HTTP to HTTPS** sur les deux behaviors.
- Default root object : `index.html`.

**Fallback SPA** : `deploy/cloudfront/spa-fallback.js` (runtime `cloudfront-js-2.0`), attaché
**uniquement** au behavior par défaut. Toute URI sans extension (`/feed`, `/debates/<id>`,
`/messages/<id>`, `/profile/<id>`, `/notifications`…) est réécrite en `/index.html` ;
les fichiers (`*.js`, `*.css`, `favicon.ico`) passent tels quels.

> ⚠️ Ne **pas** utiliser les « Custom error responses » (403/404 → `/index.html`) de CloudFront :
> elles s'appliquent à toute la distribution et transformeraient les vraies erreurs de l'API
> (`/api/...` → 401, 404, 503) en page HTML avec un statut 200.

Limite connue : une route Angular dont le dernier segment contiendrait un point ne serait pas
réécrite. Aucune route actuelle n'est concernée (identifiants UUID).

---

## 8. CORS

Avec CloudFront, le navigateur et l'API partagent la même origine : **CORS n'intervient plus**
pour l'application. Le support CORS du backend reste en place pour un futur client sur un autre domaine.

Configuration staging : `CORS_ORIGIN=https://staging.<domaine>` (origine exacte, sans `/` final).
Sans cette variable, le backend retombe sur `http://localhost:4200` : c'est restrictif, donc sans
risque, mais à définir explicitement.

---

## 9. Health checks

| Endpoint | Vérifie | Usage |
|---|---|---|
| `GET /api/health/live` | Le processus répond (aucune requête SQL) | **Health check App Runner / ECS / ALB** |
| `GET /api/health` | Processus **et** PostgreSQL (`SELECT 1`) — 503 si la base est injoignable | Smoke tests, supervision |

Pourquoi deux endpoints : le health check de la plateforme décide du succès d'un déploiement et du
remplacement des instances. S'il interrogeait Supabase, une indisponibilité de la base (par exemple
la **mise en pause automatique d'un projet Supabase gratuit**) ferait échouer les déploiements ou
recycler des conteneurs sains, sans rien réparer. Le backend démarre même si la base est injoignable.

Configuration App Runner suggérée : protocole HTTP, chemin `/api/health/live`, intervalle 10 s,
timeout 5 s, seuil sain 1, seuil non sain 5.

---

## 10. Logs

- NestJS écrit sur stdout/stderr ; App Runner les envoie automatiquement dans CloudWatch Logs
  (`/aws/apprunner/<service>/<id>/application`).
- **Définir une rétention** (ex. 14 jours) : par défaut les logs n'expirent jamais.
- Vérifié localement : aucun secret (URL de base, mot de passe, `JWT_SECRET`) n'apparaît dans les
  logs de démarrage ni pendant les requêtes. Les erreurs de notification sont journalisées en
  avertissement avec l'identifiant utilisateur seulement.
- L'application gère `SIGTERM` (`enableShutdownHooks`) et ferme la connexion Prisma à l'arrêt.

---

## 11. Coûts approximatifs (staging peu utilisé, USD/mois, hors taxes)

Estimations indicatives à revalider avec le calculateur AWS pour la région choisie.

| Poste | Estimation | Hypothèse |
|---|---|---|
| App Runner | 3 – 7 $ | 1 instance 0,25 vCPU / 0,5–1 Go, mémoire facturée au repos, CPU seulement pendant les requêtes ; + 1 $ si déploiement automatique depuis ECR |
| ECR | < 0,50 $ | ~10 images conservées (règle de cycle de vie), 0,10 $/Go |
| S3 | < 0,10 $ | quelques Mo + requêtes |
| CloudFront (+ Function) | 0 – 1 $ | reste en général dans le niveau gratuit permanent |
| Parameter Store | 0 $ | paramètres SecureString standard (Secrets Manager : 0,40 $/secret) |
| CloudWatch Logs | < 1 $ | quelques centaines de Mo, rétention 14 jours |
| ACM | 0 $ | certificat public |
| Route 53 (optionnel) | 0,50 $ | zone hébergée ; nom de domaine en plus (~10–15 $/an selon l'extension) |
| **Total AWS** | **≈ 5 – 10 $** | |
| *Alternative ECS Fargate + ALB* | *≈ 30 – 40 $* | *ALB ≈ 16 $, IPv4 publiques, tâche 0,25 vCPU* |
| Supabase (hors AWS) | 0 $ ou 25 $ | Gratuit (mise en pause après inactivité) ou Pro |

---

## 12. Ordre de mise en place (futur)

0. **Décisions** : région, base Supabase de staging, domaine (voir § 14).
1. Installer Docker, construire et tester les images en local (§ 4).
2. Créer le dépôt **ECR** (+ règle de cycle de vie).
3. Créer les paramètres **SSM** (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`).
4. Créer les rôles **IAM** (accès ECR pour App Runner, rôle d'instance lisant SSM).
5. **Pousser** les images `runtime` et `migrate` (tag = SHA Git).
6. **Migrations** si la base de staging n'est pas à jour (§ 5) — avant le premier démarrage du backend.
7. Créer le service **App Runner** ; vérifier `https://<id>.awsapprunner.com/api/health` → 200.
8. Demander le certificat **ACM** dans `us-east-1` (peut être lancé dès l'étape 0, validation DNS).
9. Créer le bucket **S3** privé.
10. Publier la **CloudFront Function** `spa-fallback`.
11. Créer la distribution **CloudFront** : 2 origines, OAC + bucket policy, 2 behaviors, domaine + certificat.
12. **DNS** : `staging.<domaine>` → CloudFront.
13. **Build et upload** du frontend (§ 6), invalidation de `index.html`.
14. Vérifier `CORS_ORIGIN` = domaine de staging (redéploiement App Runner si modifié).
15. **Smoke tests** :
    1. `GET /api/health/live` → 200 ; `GET /api/health` → 200, `database: "up"`
    2. `GET /` et `GET /feed` (ouverture directe) → page Angular
    3. `GET /api/nimporte` → **404 JSON** (et non `index.html`)
    4. Login puis appel authentifié (`GET /api/users/me`) → 200 : l'en-tête `Authorization` traverse CloudFront
    5. Parcours : feed, débats, messages, notifications ; rafraîchir `/debates/<id>`
    6. Aucun `5xx` dans CloudWatch pendant le parcours

---

## 13. Retour arrière (conceptuel)

| Élément | Retour arrière |
|---|---|
| Backend | Redéployer l'image du tag précédent dans App Runner (images conservées dans ECR) |
| Frontend | Ré-uploader le build précédent (conserver les artefacts par SHA) ou restaurer via le versioning S3, puis invalider `/index.html` |
| Base de données | Pas de retour arrière automatique des migrations : correction par une nouvelle migration (d'où la règle de compatibilité du § 5) |

---

## 14. Décisions à prendre avant la mise en place

1. **Région** du backend (proximité avec Supabase `ca-central-1` vs disponibilité d'App Runner).
2. **Base de staging** : réutiliser le projet Supabase actuel (données de développement) ou créer
   un projet dédié (base vide → `migrate:deploy`, puis données de test à définir).
3. **Plan Supabase** : le plan gratuit met le projet en pause après inactivité (staging indisponible).
4. **Domaine** : nom de staging et hébergement DNS (Route 53 ou fournisseur actuel).
5. **Accès direct à l'URL App Runner** : elle reste publique et contourne CloudFront ; acceptable en
   staging, à restreindre plus tard (en-tête secret vérifié par le backend, ou ECS + ALB privé).
