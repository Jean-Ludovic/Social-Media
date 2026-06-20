import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { ApiService } from './api';

interface LoginDto    { email: string; password: string; }
interface RegisterDto { email: string; password: string; displayName: string; bio?: string; }
interface AuthResponse { user: UserProfile; access_token: string; }

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api    = inject(ApiService);
  private readonly router = inject(Router);

  currentUser = signal<UserProfile | null>(this.loadStoredUser());

  get isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }

  login(dto: LoginDto) {
    return this.api.post<AuthResponse>('/auth/login', dto).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  register(dto: RegisterDto) {
    return this.api.post<AuthResponse>('/auth/register', dto).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  updateCurrentUser(user: UserProfile) {
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  private handleAuthResponse(res: AuthResponse) {
    localStorage.setItem('access_token', res.access_token);
    localStorage.setItem('user', JSON.stringify(res.user));
    this.currentUser.set(res.user);
  }

  private loadStoredUser(): UserProfile | null {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}
