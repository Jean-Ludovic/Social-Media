# Décisions Techniques — Réseau Social

> Dernière mise à jour : 2026-06-20  
> Ce fichier documente les choix architecturaux et leur justification.  
> Un nouvel agent doit lire ce fichier avant de proposer des alternatives aux technologies listées.

---

## D1 — Angular 21 (frontend)

**Décision :** Angular 21 avec Standalone Components.  
**Validé le :** 2026-06-11 (MVP.md) + confirmé 2026-06-20

**Pourquoi :**
- Application de taille moyenne à grande — la structure stricte d'Angular convient mieux que React ou Vue pour ce type de projet à long terme.
- Standalone Components (Angular 14+) simplifient l'arborescence (pas de NgModules explicites).
- Lazy loading natif via `loadComponent`.
- TypeScript first-class — cohérence avec le backend NestJS.
- `inject()` remplace l'injection par constructeur pour alléger le code.

**Ce qui a été écarté :**
- React : plus flexible mais nécessite des choix supplémentaires (state management, routing).
- Vue : moins adapté à une équipe ciblant un profil full-stack TypeScript structuré.

---

## D2 — NestJS 11 (backend)

**Décision :** NestJS comme framework backend Node.js.  
**Validé le :** 2026-06-11

**Pourquoi :**
- Architecture modulaire opinionée qui impose une structure claire (modules, controllers, services, DTOs).
- Décorateurs TypeScript expressifs proches de Spring Boot / Django — facile à comprendre pour un développeur venant d'autres frameworks.
- Écosystème riche : `@nestjs/jwt`, `@nestjs/passport`, `@nestjs/config`, `@nestjs/schedule`, `@nestjs/websockets`.
- `class-validator` intégré pour la validation des DTOs.

**Ce qui a été écarté :**
- Express seul : trop peu structuré pour ce projet.
- Fastify seul : même raison.

---

## D3 — PostgreSQL sur Supabase (base de données)

**Décision :** PostgreSQL hébergé via Supabase (connexion directe par `DATABASE_URL`).  
**Validé le :** 2026-06-11

**Pourquoi Supabase :**
- PostgreSQL managé sans configuration serveur — accès immédiat via connection string.
- Dashboard web pour visualiser les données pendant le développement.
- Gratuit pour les projets de petite/moyenne taille.
- Possibilité d'activer Supabase Auth, Storage, Realtime plus tard si besoin.

**Important :**
- **Supabase Auth n'est pas utilisé** — l'authentification passe par JWT NestJS.
- Supabase est utilisé **uniquement comme hébergeur PostgreSQL**.
- Les clés `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` sont présentes dans `.env.example` pour un usage futur éventuel mais non actifs pour l'instant.

---

## D4 — Prisma vs TypeORM (ORM)

**Décision :** **Prisma** est l'ORM retenu.  
**Validé le :** 2026-06-20

**Pourquoi Prisma plutôt que TypeORM :**

| Critère                   | Prisma                                   | TypeORM                                    |
|---------------------------|------------------------------------------|--------------------------------------------|
| Schéma                    | Fichier `schema.prisma` unique et lisible | Décorateurs sur entités TypeScript          |
| Type safety               | Types générés automatiquement à partir du schéma | Types manuels, risque de désync         |
| Migrations                | `prisma migrate dev` — prévisibles et versionnées | Migrations moins fiables en pratique    |
| Queries                   | API fluide (`prisma.user.findMany(...)`) | Moins intuitif, QueryBuilder verbeux       |
| Debugging                 | `prisma studio` — interface web des données | Pas d'équivalent natif                  |
| Support NestJS            | Premier classe via `@prisma/client`       | Officiel via `@nestjs/typeorm`             |
| Performance               | Comparable                                | Comparable                                 |
| Maturité                  | Stable, très actif                        | Plus ancien mais moins de mises à jour     |

**Conclusion :** Prisma offre une meilleure expérience développeur, une plus grande sécurité de type et des outils de migration plus fiables.

**État actuel :** Les modules NestJS utilisent encore des **entités TypeScript mock** (classes simples sans ORM). La prochaine étape est d'installer Prisma et de connecter les services.

---

## D5 — JWT NestJS (authentification)

**Décision :** JSON Web Tokens gérés entièrement par NestJS (`@nestjs/jwt` + `passport-jwt`).  
**Validé le :** 2026-06-11

**Pourquoi :**
- Contrôle total sur la logique d'authentification.
- Pas de dépendance à un service externe (Supabase Auth, Auth0, Firebase).
- Simple à implémenter et à maintenir.

**Implémentation :**
- Token signé avec `JWT_SECRET` (env), expiration `JWT_EXPIRES_IN` (env, 7j par défaut).
- Payload : `{ sub: user.id, email: user.email }`.
- `JwtStrategy` valide le token et injecte l'utilisateur dans `req.user`.
- `JwtAuthGuard` protège toutes les routes sauf `/auth/register` et `/auth/login`.

**Ce qui a été écarté :**
- Supabase Auth : ajout de complexité sans bénéfice clair à ce stade.
- Session cookies : moins adapté à une architecture SPA + API REST.

---

## D6 — Tailwind CSS (styles)

**Décision :** Tailwind CSS 3.4 pour les styles frontend.  
**Validé le :** 2026-06-11

**Pourquoi :**
- Classes utilitaires directement dans le HTML — pas de fichiers CSS à maintenir en parallèle.
- Design system minimal sans imposer de composants UI préconstruits.
- Compatible Angular avec PostCSS.

**Ce qui a été écarté :**
- Angular Material : trop opinioné visuellement pour un réseau social custom.
- Bootstrap : trop daté pour un nouveau projet.

---

## D7 — Architecture de messagerie cible

**Décision :** Migrer du modèle `sender_id / receiver_id` vers le modèle `conversations + conversation_participants + messages`.

**Pourquoi :**
- Le modèle actuel `sender_id / receiver_id` ne supporte pas les conversations de groupe.
- Le modèle conversations est extensible pour ajouter des groupes sans refonte.
- Tri naturel des conversations par `last_message_at`.

**État actuel :** L'entité `Message` utilise encore `senderId / receiverId`. La migration vers `conversation_id` sera faite lors de l'intégration Prisma.

---

## D8 — Structure des débats

**Décision :** Un débat est un `Post` avec `type = 'debate'` + des entrées dans `debate_sides`.

**Pourquoi :**
- Réutilise le module Posts existant pour la création.
- Les débats apparaissent naturellement dans le feed.
- `debate_sides` isole la logique de vote.
- `debate_votes` garantit l'unicité du vote par utilisateur.

---

## Roadmap technique — Prochaines étapes

| Priorité | Étape                                     | Détails                                                      |
|----------|-------------------------------------------|--------------------------------------------------------------|
| 1        | **Intégration Prisma**                    | Install, schema.prisma, migration init, PrismaService        |
| 2        | **Connexion services backend**            | Remplacer mock data par appels Prisma dans chaque service    |
| 3        | **Module Comments**                       | Routes `POST/GET /api/posts/:id/comments`                    |
| 4        | **Module Reactions**                      | Routes `POST/DELETE /api/posts/:id/reactions`                |
| 5        | **Module Follows**                        | Routes `POST/DELETE /api/follows/:userId`                    |
| 6        | **Messagerie v2**                         | Migrer vers `conversations / conversation_participants`       |
| 7        | **Votes débats**                          | `POST /api/debates/:id/vote` + table `debate_votes`          |
| 8        | **Cron statuts**                          | `@nestjs/schedule` pour nettoyer les statuts expirés         |
| 9        | **Docker Compose**                        | `docker/docker-compose.yml` (backend + postgres local)       |
| 10       | **Tests backend**                         | Tests e2e NestJS avec base de données de test                |
| 11       | **WebSocket messagerie**                  | `@nestjs/websockets` pour messages temps réel                |
| 12       | **Notifications temps réel**              | WebSocket pour push notifications                            |
| 13       | **Lives WebRTC**                          | Intégration Agora / Livekit SDK                              |
| 14       | **Déploiement AWS**                       | ECS (backend) + CloudFront (frontend) + RDS (base)           |
| 15       | **CI/CD GitHub Actions**                  | Build, test, deploy automatique sur push `main`              |

---

## Décisions encore ouvertes

| Question                                  | Options                              | Décision        |
|-------------------------------------------|--------------------------------------|-----------------|
| Pagination du feed                        | Offset-based vs Cursor-based         | À décider       |
| Upload d'images                           | Supabase Storage vs S3               | À décider       |
| State management Angular                  | Signals natifs vs NgRx Signal Store  | À décider       |
| Refresh token                             | Oui / Non                            | Non (MVP) → Oui |
| Rate limiting                             | `@nestjs/throttler`                  | À configurer    |
