# RESEAU SOCIAL — MVP

## Objectifs du MVP

Créer un réseau social centré sur les débats, les échanges d'idées et les interactions sociales en temps réel.
Le MVP doit permettre à un utilisateur de s'inscrire, d'interagir avec d'autres, de publier du contenu,
de participer à des débats, d'envoyer des messages privés, et de suivre les activités de ses amis.

---

## Fonctionnalités principales

### Authentification
- Inscription / Connexion (email + mot de passe)
- Déconnexion
- Gestion du profil utilisateur (bio, photo, nom d'affichage)

### Publications & Débats
- Créer une publication (texte, image optionnelle)
- Créer un sujet de débat (pour/contre, question ouverte)
- Commenter une publication ou un débat
- Liker / réagir à un post
- Partager une publication

### Relations sociales
- Envoyer / accepter / refuser une demande d'ami
- Suivre un utilisateur (abonnement sans réciprocité)
- Voir le fil d'actualité (amis + abonnements)

### Messagerie privée
- Envoyer un message texte à un ami
- Voir les conversations existantes
- Indicateur de message lu / non lu

### Statuts
- Publier un statut texte visible par ses amis (expire après 24h)
- Voir les statuts de ses amis

### Lives / Statuts instantanés (base posée, développement ultérieur)
- Lancer un live (intégration WebSocket prévue)
- Visualisation basique du live par les abonnés

---

## Pages frontend (Angular)

| Page | Description |
|------|-------------|
| `/login` | Connexion |
| `/register` | Inscription |
| `/feed` | Fil d'actualité |
| `/debates` | Liste des débats |
| `/debates/:id` | Détail d'un débat |
| `/profile/:id` | Profil utilisateur |
| `/messages` | Liste des conversations |
| `/messages/:id` | Conversation avec un utilisateur |
| `/status` | Voir les statuts des amis |
| `/live` | Accéder / regarder un live (MVP simplifié) |
| `/settings` | Paramètres du compte |

---

## Entités backend (NestJS + PostgreSQL)

### `users`
- id, email, password_hash, display_name, bio, avatar_url, created_at

### `posts`
- id, author_id, content, image_url, type (post | debate), created_at

### `debate_sides`
- id, post_id, label (ex: "Pour" / "Contre"), votes_count

### `comments`
- id, post_id, author_id, content, created_at

### `reactions`
- id, post_id, user_id, type (like | love | angry…), created_at

### `friendships`
- id, requester_id, receiver_id, status (pending | accepted | rejected), created_at

### `follows`
- id, follower_id, following_id, created_at

### `messages`
- id, sender_id, receiver_id, content, read_at, created_at

### `conversations`
- id, participant_1_id, participant_2_id, last_message_at

### `statuses`
- id, user_id, content, expires_at, created_at

### `lives`
- id, host_id, title, stream_url, started_at, ended_at

---

## Règles de base

- Toute route API (sauf login/register) nécessite une authentification JWT.
- Un utilisateur ne peut envoyer un message privé qu'à un ami accepté.
- Un statut expire automatiquement après 24 heures.
- Un débat est un post avec `type = 'debate'` et au moins deux sides (pour/contre).
- Les mots de passe sont stockés hachés (bcrypt).
- Les données sensibles ne sont jamais exposées dans les réponses API.
- Validation stricte des entrées côté backend (class-validator).

---

## Prochaines étapes

1. **Structure initiale** (en cours) — dossiers, fichiers de config, Docker
2. **Backend NestJS** — init du projet, modules Auth, Users, Posts
3. **Base de données** — migrations Supabase, modèles Prisma ou TypeORM
4. **Frontend Angular** — init, routing, pages Login / Register / Feed
5. **Messagerie privée** — WebSocket ou polling
6. **Statuts 24h** — module dédié + cron de nettoyage
7. **Débats** — module avec sides et vote
8. **Lives** — WebRTC ou intégration externe (ex: Agora, Livekit)
9. **Déploiement AWS** — ECS / RDS / S3, CI/CD GitHub Actions
10. **Kubernetes** — migration progressive selon la charge

---

_Dernière mise à jour : 2026-06-11_
