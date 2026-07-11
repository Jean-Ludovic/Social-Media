import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api';
import { AuthService, UserProfile } from '../../core/services/auth';
import { BackButton } from '../../core/components/back-button/back-button';
import { Breadcrumb, BreadcrumbItem } from '../../core/components/breadcrumb/breadcrumb';

@Component({
  selector: 'app-profile',
  imports: [FormsModule, BackButton, Breadcrumb],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth  = inject(AuthService);
  private readonly api   = inject(ApiService);

  breadcrumb(): BreadcrumbItem[] {
    return [
      { label: 'Accueil', link: '/feed' },
      { label: this.profile()?.displayName ?? 'Profil' },
    ];
  }

  profile = signal<UserProfile | null>(null);
  loading = signal(true);
  error   = signal('');
  isOwner = signal(false);
  editing = signal(false);
  saving  = signal(false);

  editForm  = { displayName: '', bio: '', avatarUrl: '' };
  editError = '';

  initials = computed(() => {
    const name = this.profile()?.displayName ?? '';
    return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '??';
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    const me = this.auth.currentUser();

    if (id === 'me' || (me && id === me.id)) {
      this.isOwner.set(true);
      this.loadOwnProfile();
    } else {
      this.loadPublicProfile(id);
    }
  }

  private loadOwnProfile() {
    this.api.get<UserProfile>('/users/me').subscribe({
      next: (user) => {
        this.profile.set(user);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger votre profil.');
        this.loading.set(false);
      },
    });
  }

  private loadPublicProfile(id: string) {
    this.api.get<UserProfile>(`/users/${id}`).subscribe({
      next: (user) => {
        this.profile.set(user);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.status === 404 ? 'Ce profil est introuvable.' : 'Impossible de charger ce profil.');
        this.loading.set(false);
      },
    });
  }

  startEdit() {
    const p = this.profile();
    if (!p) return;
    this.editForm  = { displayName: p.displayName, bio: p.bio ?? '', avatarUrl: p.avatarUrl ?? '' };
    this.editError = '';
    this.editing.set(true);
  }

  cancelEdit() {
    this.editing.set(false);
    this.editError = '';
  }

  saveEdit() {
    if (!this.editForm.displayName.trim()) {
      this.editError = "Le nom d'affichage est requis.";
      return;
    }
    this.saving.set(true);
    this.editError = '';

    const dto: Record<string, string> = { displayName: this.editForm.displayName.trim() };
    if (this.editForm.bio.trim())       dto['bio']       = this.editForm.bio.trim();
    if (this.editForm.avatarUrl.trim()) dto['avatarUrl'] = this.editForm.avatarUrl.trim();

    this.api.patch<UserProfile>('/users/me', dto).subscribe({
      next: (updated) => {
        this.profile.set(updated);
        this.auth.updateCurrentUser(updated);
        this.saving.set(false);
        this.editing.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.editError = 'Erreur lors de la sauvegarde. Réessayez.';
      },
    });
  }
}
