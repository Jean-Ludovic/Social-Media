import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../core/services/api';
import { AuthService } from '../../core/services/auth';

interface LiveItem {
  id: string;
  hostId: string;
  hostName: string;
  hostAvatarUrl: string | null;
  title: string;
  streamUrl: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

@Component({
  selector: 'app-lives',
  imports: [FormsModule],
  templateUrl: './lives.html',
  styleUrl: './lives.scss',
})
export class Lives implements OnInit {
  private readonly api  = inject(ApiService);
  private readonly auth = inject(AuthService);

  private readonly coverGradients = [
    'linear-gradient(135deg,#667eea,#764ba2)',
    'linear-gradient(135deg,#f093fb,#f5576c)',
    'linear-gradient(135deg,#4facfe,#00f2fe)',
    'linear-gradient(135deg,#43e97b,#38f9d7)',
    'linear-gradient(135deg,#fa709a,#fee140)',
  ];
  private readonly avatarGradients = [
    'linear-gradient(135deg, #ec4899, #f43f5e)',
    'linear-gradient(135deg, #3b82f6, #06b6d4)',
    'linear-gradient(135deg, #22c55e, #10b981)',
    'linear-gradient(135deg, #f97316, #f59e0b)',
    'linear-gradient(135deg, #8b5cf6, #a855f7)',
  ];

  lives   = signal<LiveItem[]>([]);
  loading = signal(true);
  error   = signal('');

  showComposer = signal(false);
  newTitle     = '';
  starting     = signal(false);
  startError   = '';

  ending   = signal(false);
  endError = signal('');

  readonly activeLives = computed(() => this.lives().filter((l) => !!l.startedAt && !l.endedAt));
  readonly endedLives  = computed(() => this.lives().filter((l) => !!l.endedAt));
  readonly myActiveLive = computed(() =>
    this.activeLives().find((l) => l.hostId === this.auth.currentUser()?.id) ?? null,
  );

  ngOnInit() {
    this.loadLives();
  }

  loadLives() {
    this.loading.set(true);
    this.error.set('');
    this.api.get<LiveItem[]>('/lives?status=all').subscribe({
      next:  (list) => { this.lives.set(list);                                this.loading.set(false); },
      error: ()     => { this.error.set('Impossible de charger les lives.'); this.loading.set(false); },
    });
  }

  toggleComposer() {
    this.showComposer.update((v) => !v);
    this.newTitle = '';
    this.startError = '';
  }

  startLive() {
    const title = this.newTitle.trim();
    if (!title || this.starting()) return;
    this.starting.set(true);
    this.startError = '';

    this.api.post<LiveItem>('/lives/start', { title }).subscribe({
      next: (live) => {
        this.lives.update((list) => [live, ...list]);
        this.newTitle = '';
        this.starting.set(false);
        this.showComposer.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.startError = err.status === 409
          ? 'Vous avez déjà un live en cours.'
          : 'Impossible de démarrer le live. Réessayez.';
        this.starting.set(false);
      },
    });
  }

  endLive(live: LiveItem) {
    if (this.ending()) return;
    this.ending.set(true);
    this.endError.set('');

    this.api.patch<LiveItem>(`/lives/${live.id}/end`, {}).subscribe({
      next: (updated) => {
        this.lives.update((list) => list.map((l) => (l.id === updated.id ? updated : l)));
        this.ending.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          // Already ended elsewhere: resync with the server state.
          this.loadLives();
        } else {
          this.endError.set('Impossible de terminer le live. Réessayez.');
        }
        this.ending.set(false);
      },
    });
  }

  initials(name: string): string {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '??';
  }

  private pick(list: string[], id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % list.length;
    return list[hash];
  }

  coverColor(id: string): string {
    return this.pick(this.coverGradients, id);
  }

  avatarColor(id: string): string {
    return this.pick(this.avatarGradients, id);
  }

  since(iso: string | null): string {
    if (!iso) return '';
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1)  return "à l'instant";
    if (mins < 60) return `depuis ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `depuis ${hrs}h`;
    return `depuis ${Math.floor(hrs / 24)}j`;
  }

  duration(live: LiveItem): string {
    if (!live.startedAt || !live.endedAt) return '';
    const mins = Math.max(0, Math.round((new Date(live.endedAt).getTime() - new Date(live.startedAt).getTime()) / 60000));
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}`;
  }

  endedAgo(iso: string | null): string {
    if (!iso) return '';
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 60) return `il y a ${Math.max(mins, 1)} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `il y a ${hrs}h`;
    return `il y a ${Math.floor(hrs / 24)}j`;
  }
}
