import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.Register),
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then(m => m.MainLayout),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'feed', pathMatch: 'full' },
      {
        path: 'feed',
        loadComponent: () => import('./features/feed/feed').then(m => m.Feed),
      },
      {
        path: 'profile/:id',
        loadComponent: () => import('./features/profile/profile').then(m => m.Profile),
      },
      {
        path: 'friends',
        loadComponent: () => import('./features/friends/friends').then(m => m.Friends),
      },
      {
        path: 'messages',
        loadComponent: () => import('./features/messages/messages').then(m => m.Messages),
      },
      {
        path: 'messages/:conversationId',
        loadComponent: () => import('./features/messages/messages').then(m => m.Messages),
      },
      {
        path: 'debates',
        loadComponent: () => import('./features/debates/debates').then(m => m.Debates),
      },
      {
        path: 'debates/:id',
        loadComponent: () => import('./features/debates/debate-detail/debate-detail').then(m => m.DebateDetail),
      },
      {
        path: 'statuses',
        loadComponent: () => import('./features/statuses/statuses').then(m => m.Statuses),
      },
      {
        path: 'lives',
        loadComponent: () => import('./features/lives/lives').then(m => m.Lives),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
