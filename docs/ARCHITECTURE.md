# Architecture Globale — Réseau Social

> Dernière mise à jour : 2026-06-20

---

## Vue d'ensemble

Application de réseau social centré sur les débats, la messagerie privée et les interactions en temps réel. Le système suit une architecture **client-serveur** découplée avec un frontend Angular et un backend NestJS exposant une API REST JSON.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                               │
│               Angular 21 (SPA)                              │
│         http://localhost:4200 (dev)                         │
│    https://reseau-social.com (prod — à définir)             │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS / REST JSON
                       │ JWT Bearer Token (Authorization header)
┌──────────────────────▼──────────────────────────────────────┐
│                        BACKEND                              │
│               NestJS 11 (Node.js)                           │
│           http://localhost:3000/api (dev)                   │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────────────┐  │
│  │  Auth   │ │  Users  │ │  Posts   │ │    Debates     │  │
│  ├─────────┤ ├─────────┤ ├──────────┤ ├────────────────┤  │
│  │Friends  │ │Messages │ │ Statuses │ │     Lives      │  │
│  ├─────────┘ └─────────┘ └──────────┘ └────────────────┘  │
│  │ Notifications                                            │
│  └──────────────────────────────────────────────────────── │
└──────────────────────┬──────────────────────────────────────┘
                       │ Prisma ORM (à implémenter)
                       │ connection string PostgreSQL
┌──────────────────────▼──────────────────────────────────────┐
│                      DATABASE                               │
│          PostgreSQL via Supabase (cloud)                    │
│        (Supabase Auth NON utilisé — JWT NestJS)             │
└─────────────────────────────────────────────────────────────┘
```

---

## Stack technique

| Couche       | Technologie          | Version   | Notes                             |
|--------------|----------------------|-----------|-----------------------------------|
| Frontend     | Angular              | 21.2      | Standalone components, lazy load  |
| Styles       | Tailwind CSS         | 3.4       | Utilitaire, pas de UI kit         |
| Tests front  | Vitest               | —         | Remplace Jest pour Angular        |
| Backend      | NestJS               | 11.0      | Framework Node.js structuré       |
| Runtime      | Node.js              | —         | TypeScript compilé                |
| ORM          | Prisma               | à installer | Remplace les entités mock actuelles |
| Base données | PostgreSQL           | —         | Hébergée sur Supabase             |
| Auth         | JWT (NestJS)         | —         | Passport.js + @nestjs/jwt         |
| Hachage MDP  | bcrypt               | 5.1       | Facteur de coût 10                |
| Validation   | class-validator      | 0.14      | DTOs NestJS                       |
| Conteneur    | Docker               | à configurer | docker/ dossier prêt              |

---

## Flux d'authentification

```
Client                           Backend
  │                                  │
  │── POST /api/auth/register ───────▶│
  │   { email, password, displayName }│
  │                                  │── bcrypt.hash(password, 10)
  │                                  │── INSERT INTO users
  │◀── { user, access_token } ───────│── jwtService.sign({ sub, email })
  │                                  │
  │── POST /api/auth/login ──────────▶│
  │   { email, password }            │
  │                                  │── findByEmail + bcrypt.compare
  │◀── { user, access_token } ───────│── jwtService.sign(...)
  │                                  │
  │── GET /api/* ────────────────────▶│
  │   Authorization: Bearer <token>  │── JwtAuthGuard → JwtStrategy
  │                                  │── jwtService.verify → @CurrentUser()
  │◀── 200 / 401 ─────────────────── │
```

Le token JWT est stocké côté client et injecté automatiquement via `AuthInterceptor` dans chaque requête HTTP.

---

## Découpage en couches (backend)

```
Request
  └── Controller (routing, validation DTO)
        └── Service (logique métier)
              └── Prisma Client (accès BDD — à intégrer)
                    └── PostgreSQL (Supabase)
```

Chaque module NestJS est **auto-contenu** : controller + service + module + DTOs + entité.

---

## Variables d'environnement (backend)

| Variable                  | Rôle                               | Obligatoire |
|---------------------------|------------------------------------|-------------|
| `DATABASE_URL`            | Connexion PostgreSQL (Supabase)    | Oui         |
| `JWT_SECRET`              | Clé de signature JWT               | Oui         |
| `JWT_EXPIRES_IN`          | Durée de vie du token (défaut 7d)  | Oui         |
| `CORS_ORIGIN`             | Origine autorisée (frontend URL)   | Oui         |
| `PORT`                    | Port d'écoute (défaut 3000)        | Non         |
| `NODE_ENV`                | Environnement (development/prod)   | Non         |
| `SUPABASE_URL`            | URL projet Supabase (pour futures  | Non         |
| `SUPABASE_ANON_KEY`       | opérations directes Supabase)      | Non         |
| `SUPABASE_SERVICE_ROLE_KEY` | (réservé usage futur)            | Non         |

---

## Structure des dossiers

```
Social-media/
├── backend/                  # NestJS API
│   ├── src/
│   │   ├── app.module.ts     # Module racine (importe tout)
│   │   ├── main.ts           # Bootstrap (port 3000, /api prefix, CORS)
│   │   ├── common/           # Guards et décorateurs partagés
│   │   └── modules/          # 9 modules métier
│   ├── .env.example
│   └── package.json
├── frontend/                 # Angular SPA
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.routes.ts       # Routing (lazy-loaded)
│   │   │   ├── app.config.ts       # Configuration Angular
│   │   │   ├── core/               # Services, guards, interceptors
│   │   │   ├── features/           # 8 features (pages)
│   │   │   └── layout/             # Layout principal avec navbar
│   │   └── environments/           # Configs dev/prod
│   └── package.json
├── database/                 # Prisma schema + migrations (à créer)
├── docker/                   # Docker Compose (à créer)
└── docs/                     # Documentation technique (ce dossier)
```

---

## Prochaines étapes d'infrastructure

1. Intégrer Prisma : `npm install prisma @prisma/client` dans `backend/`
2. Créer `database/schema.prisma` avec tous les modèles
3. Configurer `DATABASE_URL` dans `backend/.env`
4. Exécuter `prisma migrate dev` pour créer les tables sur Supabase
5. Remplacer les entités mock par les appels `prisma.xxx.findMany(...)` dans chaque service
6. Créer `docker/docker-compose.yml` pour l'environnement local de développement

Voir [DECISIONS.md](DECISIONS.md) pour la justification des choix techniques.
