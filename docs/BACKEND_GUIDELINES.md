# Directives Backend — NestJS

> Dernière mise à jour : 2026-06-20  
> Framework : NestJS 11 | Runtime : Node.js | ORM cible : Prisma

---

## Conventions générales

- **Un module = un dossier** dans `backend/src/modules/`.
- Chaque module expose : controller, service, module, DTOs, entité (future : modèle Prisma).
- Les routes sont toutes préfixées `/api` (configuré dans `main.ts`).
- Toutes les routes sauf `POST /api/auth/register` et `POST /api/auth/login` nécessitent `JwtAuthGuard`.
- L'utilisateur connecté est injecté via le décorateur `@CurrentUser()` (`backend/src/common/decorators/current-user.decorator.ts`).
- Les entrées sont validées avec `class-validator` sur chaque DTO.
- Les sorties ne doivent **jamais** exposer `password` ou `password_hash`.

---

## Structure d'un module type

```
modules/
└── <feature>/
    ├── <feature>.module.ts       # Imports, providers, exports
    ├── <feature>.controller.ts   # Routes, @UseGuards, @Body, @Param
    ├── <feature>.service.ts      # Logique métier, appels Prisma
    ├── dto/
    │   ├── create-<feature>.dto.ts
    │   └── update-<feature>.dto.ts
    └── entities/
        └── <feature>.entity.ts   # Classe TypeScript (mock → Prisma)
```

---

## Modules existants

### `AuthModule` — `/api/auth`

**Fichiers :** `auth.module.ts`, `auth.controller.ts`, `auth.service.ts`  
**Stratégies :** `jwt.strategy.ts`, `local.strategy.ts`  
**DTOs :** `register.dto.ts`, `login.dto.ts`

| Endpoint              | Méthode | Auth | Description                        |
|-----------------------|---------|------|------------------------------------|
| `/api/auth/register`  | POST    | Non  | Inscription, retourne user + JWT   |
| `/api/auth/login`     | POST    | Non  | Connexion, retourne user + JWT     |

**Logique :**
- `register` : vérifie unicité email → bcrypt.hash(password, 10) → INSERT user → signe JWT
- `login` : findByEmail → bcrypt.compare → signe JWT
- JWT payload : `{ sub: user.id, email: user.email }`
- JWT expiration : `JWT_EXPIRES_IN` (env, défaut 7d)

---

### `UsersModule` — `/api/users`

**Fichiers :** `users.module.ts`, `users.controller.ts`, `users.service.ts`  
**DTOs :** `create-user.dto.ts`, `update-user.dto.ts`  
**Entité :** `user.entity.ts` → `{ id, email, password, displayName, bio, avatarUrl, createdAt }`

| Endpoint            | Méthode | Auth | Description                      |
|---------------------|---------|------|----------------------------------|
| `/api/users`        | GET     | Oui  | Liste tous les utilisateurs      |
| `/api/users/:id`    | GET     | Oui  | Profil d'un utilisateur          |
| `/api/users/:id`    | PATCH   | Oui  | Met à jour son propre profil     |
| `/api/users/:id`    | DELETE  | Oui  | Supprime le compte               |

**Note :** `UsersService` est exporté et injecté dans `AuthModule` (dépendance croisée gérée via exports).

---

### `PostsModule` — `/api/posts`

**Fichiers :** `posts.module.ts`, `posts.controller.ts`, `posts.service.ts`  
**DTOs :** `create-post.dto.ts`, `update-post.dto.ts`  
**Entité :** `post.entity.ts` → `{ id, authorId, content, imageUrl, type: 'post'|'debate', createdAt }`

| Endpoint          | Méthode | Auth | Description                      |
|-------------------|---------|------|----------------------------------|
| `/api/posts`      | GET     | Oui  | Feed (tous les posts)            |
| `/api/posts`      | POST    | Oui  | Crée un post                     |
| `/api/posts/:id`  | GET     | Oui  | Détail d'un post                 |
| `/api/posts/:id`  | PATCH   | Oui  | Modifie un post                  |
| `/api/posts/:id`  | DELETE  | Oui  | Supprime un post                 |

**À ajouter :** routes pour commentaires (`/api/posts/:id/comments`) et réactions (`/api/posts/:id/reactions`).

---

### `DebatesModule` — `/api/debates`

**Fichiers :** `debates.module.ts`, `debates.controller.ts`, `debates.service.ts`  
**DTO :** `create-debate.dto.ts`  
**Entité :** `debate.entity.ts` → `{ id, authorId, question, sides: DebateSide[], createdAt }`  
`DebateSide` → `{ id, label, votesCount }`

| Endpoint                       | Méthode | Auth | Description                 |
|--------------------------------|---------|------|-----------------------------|
| `/api/debates`                 | GET     | Oui  | Liste tous les débats        |
| `/api/debates`                 | POST    | Oui  | Crée un débat avec sides     |
| `/api/debates/:id`             | GET     | Oui  | Détail d'un débat            |
| `/api/debates/:id/vote`        | POST    | Oui  | Vote pour une side (à créer) |

**Règles métier :**
- Un débat doit avoir **au minimum 2 sides**.
- Un utilisateur ne peut voter que pour **une** side par débat.
- Le vote incrémente `debate_sides.votes_count` et insère dans `debate_votes`.

---

### `FriendshipsModule` — `/api/friendships`

**Fichiers :** `friendships.module.ts`, `friendships.controller.ts`, `friendships.service.ts`  
**DTOs :** `create-friendship.dto.ts`, `request-by-email.dto.ts`  
**Entité :** `friendship.entity.ts` → `{ id, requesterId, receiverId, status: 'pending'|'accepted'|'rejected', createdAt }`

| Endpoint                           | Méthode | Auth | Description                   |
|------------------------------------|---------|------|-------------------------------|
| `/api/friendships`                 | GET     | Oui  | Mes amis + demandes reçues    |
| `/api/friendships`                 | POST    | Oui  | Envoie une demande d'ami      |
| `/api/friendships/:id/accept`      | PATCH   | Oui  | Accepte la demande            |
| `/api/friendships/:id/reject`      | PATCH   | Oui  | Refuse la demande             |

**Règle :** un message privé n'est autorisé qu'entre deux utilisateurs ayant `status = 'accepted'`.

---

### `MessagesModule` — `/api/messages`

**Fichiers :** `messages.module.ts`, `messages.controller.ts`, `messages.service.ts`  
**DTO :** `create-message.dto.ts`  
**Entité actuelle :** `message.entity.ts` → `{ id, senderId, receiverId, content, readAt, createdAt }`

| Endpoint                        | Méthode | Auth | Description                    |
|---------------------------------|---------|------|--------------------------------|
| `/api/messages`                 | GET     | Oui  | Liste mes conversations        |
| `/api/messages/:conversationId` | GET     | Oui  | Messages d'une conversation    |
| `/api/messages`                 | POST    | Oui  | Envoie un message              |

**Migration prévue :** passer du modèle `senderId/receiverId` au modèle `conversation_id` (voir [DATABASE_DESIGN.md](DATABASE_DESIGN.md)).

---

### `StatusesModule` — `/api/statuses`

**Fichiers :** `statuses.module.ts`, `statuses.controller.ts`, `statuses.service.ts`  
**DTO :** `create-status.dto.ts`  
**Entité :** `status.entity.ts` → `{ id, userId, content, expiresAt, createdAt }`

| Endpoint          | Méthode | Auth | Description                        |
|-------------------|---------|------|------------------------------------|
| `/api/statuses`   | GET     | Oui  | Statuts actifs (expires_at > NOW()) |
| `/api/statuses`   | POST    | Oui  | Crée un statut (expire dans 24h)   |
| `/api/statuses/:id` | DELETE | Oui | Supprime son statut               |

**À ajouter :** tâche planifiée (cron) pour nettoyer les statuts expirés via `@nestjs/schedule`.

---

### `LivesModule` — `/api/lives`

**Fichiers :** `lives.module.ts`, `lives.controller.ts`, `lives.service.ts`  
**DTO :** `create-live.dto.ts`  
**Entité :** `live.entity.ts` → `{ id, hostId, title, streamUrl, startedAt, endedAt, createdAt }`

| Endpoint          | Méthode | Auth | Description                  |
|-------------------|---------|------|------------------------------|
| `/api/lives`      | GET     | Oui  | Lives actifs (endedAt = NULL) |
| `/api/lives`      | POST    | Oui  | Crée / lance un live          |
| `/api/lives/:id`  | PATCH   | Oui  | Met à jour un live            |
| `/api/lives/:id/end` | PATCH | Oui | Termine un live              |

**Évolution prévue :** intégration WebSocket (`@nestjs/websockets`) ou WebRTC externe (Agora / Livekit).

---

### `NotificationsModule` — `/api/notifications`

**Fichiers :** `notifications.module.ts`, `notifications.controller.ts`, `notifications.service.ts`  
**DTO :** `create-notification.dto.ts`  
**Entité :** `notification.entity.ts` → `{ id, userId, type, message, relatedId, read, createdAt }`

Types de notifications : `'friend_request' | 'message' | 'like' | 'comment' | 'debate' | 'live'`

| Endpoint                          | Méthode | Auth | Description                  |
|-----------------------------------|---------|------|------------------------------|
| `/api/notifications`              | GET     | Oui  | Mes notifications            |
| `/api/notifications/:id/read`     | PATCH   | Oui  | Marque comme lue             |
| `/api/notifications/read-all`     | PATCH   | Oui  | Marque toutes comme lues     |

---

## Utilitaires partagés (`backend/src/common/`)

### `JwtAuthGuard` (`guards/jwt-auth.guard.ts`)

```typescript
@UseGuards(JwtAuthGuard)  // À appliquer sur chaque route protégée
```

Hérite de `AuthGuard('jwt')`. Intercepte le header `Authorization: Bearer <token>`, vérifie la signature et injecte l'utilisateur dans la requête.

### `@CurrentUser()` (`decorators/current-user.decorator.ts`)

```typescript
@Get('profile')
getProfile(@CurrentUser() user: User) { ... }
```

Extrait `req.user` injecté par la stratégie JWT.

---

## Processus d'intégration Prisma (prochaine étape)

1. Installer : `npm install prisma @prisma/client`
2. Initialiser : `npx prisma init --datasource-provider postgresql`
3. Écrire `prisma/schema.prisma` (voir [DATABASE_DESIGN.md](DATABASE_DESIGN.md))
4. `npx prisma migrate dev --name init`
5. Créer un `PrismaService` injectable (extends `PrismaClient`, `onModuleInit`)
6. Importer `PrismaService` dans chaque module et l'injecter dans les services
7. Remplacer les mock data des services par de vrais appels Prisma

---

## Règles de sécurité backend

- Ne jamais retourner le champ `password` dans une réponse (le supprimer explicitement avec destructuring).
- Utiliser `bcrypt` avec un facteur de coût minimum de 10.
- `JWT_SECRET` doit être une chaîne aléatoire longue (≥ 32 caractères) en production.
- Activer `ValidationPipe` globalement dans `main.ts` avec `whitelist: true` (rejette les champs non déclarés dans le DTO).
- `CORS_ORIGIN` doit lister explicitement l'URL du frontend (pas de wildcard `*` en production).
- Vérifier que l'utilisateur connecté est bien le propriétaire de la ressource avant toute modification ou suppression (autorisation au niveau service).
