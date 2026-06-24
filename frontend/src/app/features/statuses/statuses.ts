import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api';
import { AuthService } from '../../core/services/auth';

interface StatusItem {
  id: string;
  userId: string;
  content: string;
  expiresAt: string;
  createdAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
}

@Component({
  selector: 'app-statuses',
  imports: [FormsModule],
  templateUrl: './statuses.html',
  styleUrl: './statuses.scss',
})
export class Statuses implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth        = inject(AuthService);

  private readonly avatarGradients = [
    'linear-gradient(135deg, #ec4899, #f43f5e)',
    'linear-gradient(135deg, #3b82f6, #06b6d4)',
    'linear-gradient(135deg, #22c55e, #10b981)',
    'linear-gradient(135deg, #f97316, #f59e0b)',
    'linear-gradient(135deg, #8b5cf6, #a855f7)',
  ];

  statuses = signal<StatusItem[]>([]);
  loading  = signal(true);
  error    = signal('');

  showComposer = signal(false);
  newContent   = '';
  posting      = signal(false);
  postError    = '';

  ngOnInit() {
    this.loadStatuses();
  }

  loadStatuses() {
    this.loading.set(true);
    this.error.set('');
    this.api.get<StatusItem[]>('/statuses').subscribe({
      next:  (list) => { this.statuses.set(list);                              this.loading.set(false); },
      error: ()     => { this.error.set('Impossible de charger les statuts.'); this.loading.set(false); },
    });
  }

  toggleComposer() {
    this.showComposer.update((v) => !v);
    this.newContent = '';
    this.postError = '';
  }

  submitStatus() {
    const content = this.newContent.trim();
    if (!content || this.posting()) return;
    this.posting.set(true);
    this.postError = '';

    this.api.post<StatusItem>('/statuses', { content }).subscribe({
      next: (status) => {
        this.statuses.update((list) => [status, ...list]);
        this.newContent = '';
        this.posting.set(false);
        this.showComposer.set(false);
      },
      error: () => {
        this.postError = 'Erreur lors de la publication. Réessayez.';
        this.posting.set(false);
      },
    });
  }

  deleteStatus(id: string) {
    this.api.delete<void>(`/statuses/${id}`).subscribe({
      next:  () => this.statuses.update((list) => list.filter((s) => s.id !== id)),
      error: () => { /* status stays in list — user can retry */ },
    });
  }

  initials(name: string): string {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '??';
  }

  avatarColor(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % this.avatarGradients.length;
    return this.avatarGradients[hash];
  }

  timeLeft(expiresAt: string): string {
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 'Expiré';
    const hrs = Math.floor(diffMs / 3600000);
    if (hrs >= 1) return `${hrs}h`;
    return `${Math.floor(diffMs / 60000)} min`;
  }

  formatTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `Il y a ${hrs}h`;
    return `Il y a ${Math.floor(hrs / 24)}j`;
  }
}
