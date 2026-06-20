# Directives Frontend — Angular 21

> Dernière mise à jour : 2026-06-20  
> Framework : Angular 21.2 | Style : Tailwind CSS 3.4 | Tests : Vitest

---

## Conventions générales

- Tous les composants sont en **Standalone** (pas de NgModule déclarés manuellement).
- Les imports de routes sont tous **lazy-loaded** (`loadComponent`).
- Le **HttpClient** est fourni via `provideHttpClient(withInterceptorsFromDi())` dans `app.config.ts`.
- L'**injection de dépendances** utilise `inject()` (pas le constructeur).
- Le **style** est en SCSS par composant + Tailwind pour les utilitaires.
- Pas d'état global (NgRx / Signal Store) pour le moment — services avec `BehaviorSubject` ou Signals.
- La **configuration d'environnement** est dans `src/environments/environment.ts` (dev) et `environment.prod.ts` (prod).

---

## Structure des dossiers

```
frontend/src/app/
├── app.ts              # Composant racine (RouterOutlet)
├── app.routes.ts       # Routes globales (lazy-loaded)
├── app.config.ts       # Fournisseurs Angular (router, http, interceptors)
├── core/               # Singleton services, guards, interceptors
│   ├── services/
│   │   ├── auth.ts         # AuthService — état utilisateur, login/logout
│   │   └── api.ts          # ApiService — wrapper HttpClient (get/post/patch/delete)
│   ├── guards/
│   │   └── auth-guard.ts   # Redirige vers /login si non authentifié
│   └── interceptors/
│       └── auth.interceptor.ts  # Injecte le JWT dans chaque requête
├── features/           # Une feature = une page ou groupe de pages
│   ├── auth/
│   ├── feed/
│   ├── profile/
│   ├── friends/
│   ├── messages/
│   ├── debates/
│   ├── statuses/
│   └── lives/
└── layout/
    └── main-layout/    # Wrapper avec navbar/sidebar — appliqué via routes enfant
```

---

## Routing global (`app.routes.ts`)

```
/login              → Login          (public)
/register           → Register       (public)
/                   → MainLayout     (protégé par authGuard)
  /feed             → Feed
  /profile/:id      → Profile
  /friends          → Friends
  /messages         → Messages       (liste des conversations)
  /messages/:conversationId → Messages (conversation spécifique)
  /debates          → Debates        (liste)
  /debates/:id      → DebateDetail
  /statuses         → Statuses
  /lives            → Lives
**                  → redirect /
```

Toutes les routes enfant de `/` passent par `canActivate: [authGuard]`.  
Le `MainLayout` englobe les pages connectées (navbar, etc.).

---

## Services core

### `ApiService` (`core/services/api.ts`)

Wrapper minimal sur `HttpClient`. À utiliser dans **tous** les services de features.

```typescript
// Usage dans un service de feature
private api = inject(ApiService);

getPosts() {
  return this.api.get<Post[]>('/posts');
}
createPost(dto: CreatePostDto) {
  return this.api.post<Post>('/posts', dto);
}
```

Méthodes disponibles : `get<T>(path)`, `post<T>(path, body)`, `patch<T>(path, body)`, `delete<T>(path)`.  
Base URL : `environment.apiUrl` (`http://localhost:3000/api` en dev, `https://api.reseau-social.com/api` en prod).

---

### `AuthService` (`core/services/auth.ts`)

Gère l'état d'authentification de l'application.

Responsabilités :
- Stocker le token JWT (localStorage)
- Exposer l'utilisateur connecté (Signal ou BehaviorSubject)
- Méthodes : `login()`, `register()`, `logout()`, `isAuthenticated()`

---

### `AuthInterceptor` (`core/interceptors/auth.interceptor.ts`)

Intercepteur HTTP fonctionnel (Angular 21). Lit le token depuis `AuthService` et l'ajoute en header :

```
Authorization: Bearer <token>
```

S'applique à toutes les requêtes via `withInterceptorsFromDi()` dans `app.config.ts`.

---

### `authGuard` (`core/guards/auth-guard.ts`)

Guard fonctionnel (`CanActivateFn`). Vérifie `AuthService.isAuthenticated()`. Si `false`, redirige vers `/login`.

---

## Features

### `auth/` — Authentification

**Composants :** `login.ts`, `register.ts`  
**Routes :** `/login`, `/register` (publiques)

Formulaires avec `ReactiveFormsModule`. Appels à `AuthService.login()` / `AuthService.register()`.  
Après succès : redirection vers `/feed`.

---

### `feed/` — Fil d'actualité

**Composant :** `feed.ts`  
**Route :** `/feed`

Affiche les posts des amis et abonnements. Liste chronologique inversée.  
Formulaire inline pour créer un nouveau post.  
Futur : pagination infinie, filtres (posts / débats).

---

### `profile/` — Profil utilisateur

**Composant :** `profile.ts`  
**Route :** `/profile/:id`

Affiche les informations d'un utilisateur (display_name, bio, avatar).  
Si `id` = utilisateur connecté → mode édition disponible.  
Affiche les posts de l'utilisateur.

---

### `friends/` — Gestion des amis

**Composant :** `friends.ts`  
**Route :** `/friends`

Trois sections :
1. Amis acceptés (liste + possibilité de supprimer)
2. Demandes reçues (accepter / refuser)
3. Rechercher un utilisateur par email pour envoyer une demande

---

### `messages/` — Messagerie privée

**Composant :** `messages.ts` (gère les deux vues)  
**Routes :** `/messages` et `/messages/:conversationId`

Vue liste : toutes les conversations, triées par `last_message_at`.  
Vue conversation : historique des messages, champ de saisie.  
Seuls les **amis acceptés** peuvent s'écrire.  
Futur : WebSocket pour les messages en temps réel.

---

### `debates/` — Débats

**Composants :** `debates.ts` (liste), `debate-detail.ts` (détail)  
**Routes :** `/debates`, `/debates/:id`

Liste : tous les débats avec nombre de votes par side.  
Détail : question, sides avec pourcentage de votes, bouton pour voter.  
Futur : formulaire de création de débat depuis le feed ou une page dédiée.

---

### `statuses/` — Statuts éphémères

**Composant :** `statuses.ts`  
**Route :** `/statuses`

Affiche les statuts des amis (filtrés : `expiresAt > now`).  
Formulaire pour créer son propre statut.  
Les statuts expirent après 24h (filtrés côté backend).

---

### `lives/` — Lives

**Composant :** `lives.ts`  
**Route :** `/lives`

Liste les lives en cours (`endedAt = NULL`).  
Vue simplifiée pour le MVP.  
Futur : intégration WebRTC ou SDK externe (Agora / Livekit) pour diffusion réelle.

---

## Layout (`layout/main-layout/`)

**Composant :** `main-layout.ts`  
Appliqué comme parent de toutes les routes protégées.

Contient :
- Barre de navigation (liens : Feed, Débats, Amis, Messages, Statuts, Lives)
- Indicateur de notifications (lien vers notifications)
- Avatar + lien vers profil de l'utilisateur connecté
- `<router-outlet>` pour le contenu des pages enfant

---

## Gestion des types TypeScript

Créer des interfaces dans `core/models/` ou dans chaque feature pour typer les réponses API :

```typescript
// Exemple : core/models/user.model.ts
export interface User {
  id: string;
  email: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
}
```

Ne jamais utiliser `any`. Typer toutes les réponses des appels `ApiService`.

---

## Environnements

| Fichier                       | Valeur `apiUrl`                        |
|-------------------------------|----------------------------------------|
| `environment.ts` (dev)        | `http://localhost:3000/api`            |
| `environment.prod.ts` (prod)  | `https://api.reseau-social.com/api`    |

---

## Tests (Vitest)

Framework : Vitest (remplace Jest pour Angular 21).  
Fichiers de test : `*.spec.ts` colocalisés avec les composants/services.  
Lancer : `npm test` dans `frontend/`.

---

## Règles de sécurité frontend

- Ne jamais stocker de données sensibles en dehors du token JWT (pas de mot de passe en localStorage).
- Toujours sanitiser les données affichées pour éviter les XSS (Angular échappe automatiquement via `{{ }}`, ne pas utiliser `innerHTML` avec des données utilisateur).
- Ne pas exposer l'URL de l'API dans le code frontend en clair en production — utiliser les fichiers `environment`.
- Déconnecter l'utilisateur (clear token + redirect `/login`) si l'intercepteur reçoit un `401`.
