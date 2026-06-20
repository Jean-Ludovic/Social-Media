# Modèle de Données — PostgreSQL (Supabase)

> Dernière mise à jour : 2026-06-20  
> ORM cible : Prisma  
> État actuel : entités TypeScript mock — migrations Prisma à réaliser

---

## Vue d'ensemble des tables

```
users ──────────────────────────────────────────────────────
  │  1─N  posts (author_id)
  │  1─N  debates (author_id)
  │  1─N  comments (author_id)
  │  1─N  reactions (user_id)
  │  1─N  friendships (requester_id | receiver_id)
  │  1─N  follows (follower_id | following_id)
  │  1─N  messages (sender_id | receiver_id)
  │  1─N  statuses (user_id)
  │  1─N  lives (host_id)
  │  1─N  notifications (user_id)
  └──────────────────────────────────────────────────────────

posts ─────────────────────────────────────────────────────
  │  1─N  comments (post_id)
  │  1─N  reactions (post_id)
  │  1─N  debate_sides (post_id)   [si type = 'debate']
  └──────────────────────────────────────────────────────────

debate_sides
  │  1─N  debate_votes (side_id)
  └──────────────────────────────────────────────────────────

conversations ─────────────────────────────────────────────
  │  1─N  conversation_participants (conversation_id)
  │  1─N  messages (conversation_id)
  └──────────────────────────────────────────────────────────
```

---

## Tables — Définition complète

### `users`

| Colonne        | Type           | Contraintes                 | Notes                        |
|----------------|----------------|-----------------------------|------------------------------|
| id             | UUID           | PK, DEFAULT gen_random_uuid | Clé primaire                 |
| email          | VARCHAR(255)   | UNIQUE, NOT NULL            | Identifiant de connexion     |
| password_hash  | VARCHAR(255)   | NOT NULL                    | bcrypt (coût 10)             |
| display_name   | VARCHAR(100)   | NOT NULL                    | Nom affiché                  |
| bio            | TEXT           | NULL                        | Description profil           |
| avatar_url     | TEXT           | NULL                        | URL image de profil          |
| created_at     | TIMESTAMPTZ    | DEFAULT NOW()               |                              |

---

### `posts`

| Colonne    | Type         | Contraintes                 | Notes                            |
|------------|--------------|-----------------------------|----------------------------------|
| id         | UUID         | PK                          |                                  |
| author_id  | UUID         | FK → users.id, NOT NULL     | ON DELETE CASCADE                |
| content    | TEXT         | NOT NULL                    | Contenu du post                  |
| image_url  | TEXT         | NULL                        | Image optionnelle                |
| type       | VARCHAR(10)  | NOT NULL                    | 'post' ou 'debate'               |
| created_at | TIMESTAMPTZ  | DEFAULT NOW()               |                                  |

> Un post de type `'debate'` doit avoir au moins deux entrées dans `debate_sides`.

---

### `debate_sides`

| Colonne     | Type        | Contraintes             | Notes                       |
|-------------|-------------|-------------------------|-----------------------------|
| id          | UUID        | PK                      |                             |
| post_id     | UUID        | FK → posts.id, NOT NULL | ON DELETE CASCADE           |
| label       | VARCHAR(100)| NOT NULL                | Ex : "Pour", "Contre"       |
| votes_count | INTEGER     | DEFAULT 0               | Mis à jour via debate_votes |

---

### `debate_votes`

> Table à créer lors de l'implémentation du module débats.

| Colonne    | Type        | Contraintes                        | Notes                  |
|------------|-------------|------------------------------------|------------------------|
| id         | UUID        | PK                                 |                        |
| side_id    | UUID        | FK → debate_sides.id, NOT NULL     | ON DELETE CASCADE      |
| user_id    | UUID        | FK → users.id, NOT NULL            | ON DELETE CASCADE      |
| created_at | TIMESTAMPTZ | DEFAULT NOW()                      |                        |
|            |             | UNIQUE (side_id, user_id)          | 1 vote par user/débat  |

> Lors d'un vote : incrémenter `debate_sides.votes_count` et insérer dans `debate_votes`.  
> Règle : un utilisateur ne peut voter que pour **une** side par débat (contrainte au niveau service).

---

### `comments`

| Colonne    | Type        | Contraintes             | Notes             |
|------------|-------------|-------------------------|-------------------|
| id         | UUID        | PK                      |                   |
| post_id    | UUID        | FK → posts.id           | ON DELETE CASCADE |
| author_id  | UUID        | FK → users.id           | ON DELETE CASCADE |
| content    | TEXT        | NOT NULL                |                   |
| created_at | TIMESTAMPTZ | DEFAULT NOW()           |                   |

---

### `reactions`

| Colonne    | Type        | Contraintes                      | Notes                    |
|------------|-------------|----------------------------------|--------------------------|
| id         | UUID        | PK                               |                          |
| post_id    | UUID        | FK → posts.id, NOT NULL          | ON DELETE CASCADE        |
| user_id    | UUID        | FK → users.id, NOT NULL          | ON DELETE CASCADE        |
| type       | VARCHAR(20) | NOT NULL                         | 'like', 'love', 'angry'… |
| created_at | TIMESTAMPTZ | DEFAULT NOW()                    |                          |
|            |             | UNIQUE (post_id, user_id)        | 1 réaction par user      |

---

### `friendships`

| Colonne      | Type        | Contraintes                  | Notes                               |
|--------------|-------------|------------------------------|-------------------------------------|
| id           | UUID        | PK                           |                                     |
| requester_id | UUID        | FK → users.id, NOT NULL      | Celui qui envoie la demande         |
| receiver_id  | UUID        | FK → users.id, NOT NULL      | Celui qui reçoit                    |
| status       | VARCHAR(20) | NOT NULL, DEFAULT 'pending'  | 'pending', 'accepted', 'rejected'   |
| created_at   | TIMESTAMPTZ | DEFAULT NOW()                |                                     |
|              |             | UNIQUE (requester_id, receiver_id) | Pas de doublon              |

---

### `follows`

| Colonne      | Type        | Contraintes                       | Notes                          |
|--------------|-------------|-----------------------------------|--------------------------------|
| id           | UUID        | PK                                |                                |
| follower_id  | UUID        | FK → users.id, NOT NULL           | Celui qui suit                 |
| following_id | UUID        | FK → users.id, NOT NULL           | Celui qui est suivi            |
| created_at   | TIMESTAMPTZ | DEFAULT NOW()                     |                                |
|              |             | UNIQUE (follower_id, following_id) | Pas de doublon                |

---

### `conversations`

> Structure cible pour la messagerie groupable. Remplace le modèle actuel sender/receiver.

| Colonne         | Type        | Contraintes   | Notes                          |
|-----------------|-------------|---------------|--------------------------------|
| id              | UUID        | PK            |                                |
| last_message_at | TIMESTAMPTZ | NULL          | Pour trier la liste des convs  |
| created_at      | TIMESTAMPTZ | DEFAULT NOW() |                                |

---

### `conversation_participants`

| Colonne         | Type        | Contraintes                          | Notes               |
|-----------------|-------------|--------------------------------------|---------------------|
| id              | UUID        | PK                                   |                     |
| conversation_id | UUID        | FK → conversations.id, NOT NULL      | ON DELETE CASCADE   |
| user_id         | UUID        | FK → users.id, NOT NULL              | ON DELETE CASCADE   |
| joined_at       | TIMESTAMPTZ | DEFAULT NOW()                        |                     |
|                 |             | UNIQUE (conversation_id, user_id)    | 1 entrée par membre |

---

### `messages`

> La colonne `conversation_id` est la cible finale. Les colonnes `sender_id`/`receiver_id` existent  
> dans l'entité actuelle (phase de transition — à migrer vers `conversation_id`).

| Colonne         | Type        | Contraintes                     | Notes                    |
|-----------------|-------------|---------------------------------|--------------------------|
| id              | UUID        | PK                              |                          |
| conversation_id | UUID        | FK → conversations.id, NOT NULL | ON DELETE CASCADE        |
| sender_id       | UUID        | FK → users.id, NOT NULL         | ON DELETE CASCADE        |
| content         | TEXT        | NOT NULL                        |                          |
| read_at         | TIMESTAMPTZ | NULL                            | NULL = non lu            |
| created_at      | TIMESTAMPTZ | DEFAULT NOW()                   |                          |

---

### `statuses`

| Colonne    | Type        | Contraintes           | Notes                             |
|------------|-------------|------------------------|-----------------------------------|
| id         | UUID        | PK                     |                                   |
| user_id    | UUID        | FK → users.id, NOT NULL | ON DELETE CASCADE                |
| content    | TEXT        | NOT NULL               |                                   |
| expires_at | TIMESTAMPTZ | NOT NULL               | Calculé : created_at + 24h        |
| created_at | TIMESTAMPTZ | DEFAULT NOW()          |                                   |

> Les statuts expirés doivent être filtrés (WHERE expires_at > NOW()) ou nettoyés via un cron.

---

### `lives`

| Colonne    | Type        | Contraintes            | Notes                          |
|------------|-------------|------------------------|--------------------------------|
| id         | UUID        | PK                     |                                |
| host_id    | UUID        | FK → users.id, NOT NULL | ON DELETE CASCADE             |
| title      | VARCHAR(255)| NOT NULL               |                                |
| stream_url | TEXT        | NULL                   | URL WebRTC / Agora / Livekit   |
| started_at | TIMESTAMPTZ | NULL                   | NULL = pas encore démarré      |
| ended_at   | TIMESTAMPTZ | NULL                   | NULL = live en cours           |
| created_at | TIMESTAMPTZ | DEFAULT NOW()          |                                |

---

### `notifications`

| Colonne    | Type        | Contraintes            | Notes                                              |
|------------|-------------|------------------------|----------------------------------------------------|
| id         | UUID        | PK                     |                                                    |
| user_id    | UUID        | FK → users.id, NOT NULL | Destinataire                                      |
| type       | VARCHAR(30) | NOT NULL               | 'friend_request','message','like','comment','debate','live' |
| message    | TEXT        | NOT NULL               | Texte affiché                                      |
| related_id | UUID        | NULL                   | ID de l'entité liée (post, friendship…)            |
| read       | BOOLEAN     | DEFAULT false          |                                                    |
| created_at | TIMESTAMPTZ | DEFAULT NOW()          |                                                    |

---

## Diagramme de relations simplifié

```
users
 ├─▶ posts          (author_id)
 │     ├─▶ comments     (post_id, author_id)
 │     ├─▶ reactions    (post_id, user_id)
 │     └─▶ debate_sides (post_id)
 │               └─▶ debate_votes (side_id, user_id)
 ├─▶ friendships    (requester_id, receiver_id)
 ├─▶ follows        (follower_id, following_id)
 ├─▶ conversation_participants (user_id)
 │     └── conversations
 │               └─▶ messages (conversation_id, sender_id)
 ├─▶ statuses       (user_id)
 ├─▶ lives          (host_id)
 └─▶ notifications  (user_id)
```

---

## Règles d'intégrité à respecter

- Tous les IDs sont des **UUID v4** (pas d'auto-increment entier).
- Toutes les FK ont `ON DELETE CASCADE` sauf mention contraire.
- Le `password_hash` ne doit **jamais** apparaître dans une réponse API.
- Les timestamps sont en **TIMESTAMPTZ** (timezone-aware).
- Les contraintes `UNIQUE` sur les relations (friendships, reactions, follows) évitent les doublons au niveau base.
- Indexer : `users.email`, `posts.author_id`, `friendships.requester_id + receiver_id`, `messages.conversation_id`, `statuses.expires_at`.

---

## Ordre de migration Prisma (dépendances)

```
1. users
2. posts
3. debate_sides
4. debate_votes
5. comments
6. reactions
7. friendships
8. follows
9. conversations
10. conversation_participants
11. messages
12. statuses
13. lives
14. notifications
```
