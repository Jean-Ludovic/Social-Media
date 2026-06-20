import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api';

interface FriendEntry {
  friendshipId: string;
  friendId: string;
  friendName: string;
}

interface PendingEntry {
  friendshipId: string;
  requesterId: string;
  requesterName: string;
}

interface SendFeedback {
  type: 'success' | 'error';
  msg: string;
}

@Component({
  selector: 'app-friends',
  imports: [FormsModule],
  templateUrl: './friends.html',
  styleUrl: './friends.scss',
})
export class Friends implements OnInit {
  private readonly api = inject(ApiService);

  friends  = signal<FriendEntry[]>([]);
  pending  = signal<PendingEntry[]>([]);
  loading  = signal(true);
  error    = signal('');

  searchEmail  = '';
  sending      = signal(false);
  sendFeedback = signal<SendFeedback | null>(null);

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loading.set(true);
    this.error.set('');
    let done = 0;
    const onDone = () => { if (++done === 2) this.loading.set(false); };

    this.api.get<FriendEntry[]>('/friendships').subscribe({
      next:  (list) => { this.friends.set(list); onDone(); },
      error: ()     => { this.error.set('Impossible de charger vos données. Réessayez.'); this.loading.set(false); },
    });

    this.api.get<PendingEntry[]>('/friendships/pending').subscribe({
      next:  (list) => { this.pending.set(list); onDone(); },
      error: ()     => { this.error.set('Impossible de charger vos données. Réessayez.'); this.loading.set(false); },
    });
  }

  sendRequest() {
    const email = this.searchEmail.trim();
    if (!email || this.sending()) return;
    this.sending.set(true);
    this.sendFeedback.set(null);

    this.api.post<unknown>('/friendships/request-by-email', { email }).subscribe({
      next: () => {
        this.searchEmail = '';
        this.sending.set(false);
        this.sendFeedback.set({ type: 'success', msg: "Demande d'amitié envoyée !" });
        setTimeout(() => this.sendFeedback.set(null), 4000);
      },
      error: (err) => {
        this.sending.set(false);
        let msg = 'Erreur lors de l\'envoi. Réessayez.';
        if (err.status === 404)      msg = 'Aucun utilisateur trouvé avec cet email.';
        else if (err.status === 409) msg = 'Une demande existe déjà avec cet utilisateur.';
        else if (err.status === 400) msg = 'Vous ne pouvez pas vous envoyer une demande à vous-même.';
        this.sendFeedback.set({ type: 'error', msg });
      },
    });
  }

  accept(entry: PendingEntry) {
    this.api.patch<unknown>(`/friendships/${entry.friendshipId}/accept`, {}).subscribe({
      next: () => {
        this.pending.update(list => list.filter(p => p.friendshipId !== entry.friendshipId));
        this.friends.update(list => [
          { friendshipId: entry.friendshipId, friendId: entry.requesterId, friendName: entry.requesterName },
          ...list,
        ]);
      },
      error: () => { /* silent — user can reload */ },
    });
  }

  reject(entry: PendingEntry) {
    this.api.patch<unknown>(`/friendships/${entry.friendshipId}/reject`, {}).subscribe({
      next:  () => this.pending.update(list => list.filter(p => p.friendshipId !== entry.friendshipId)),
      error: () => { /* silent */ },
    });
  }

  onSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') this.sendRequest();
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
  }

  avatarColor(id: string): string {
    const gradients = [
      'linear-gradient(135deg, #ec4899, #f43f5e)',
      'linear-gradient(135deg, #3b82f6, #06b6d4)',
      'linear-gradient(135deg, #22c55e, #10b981)',
      'linear-gradient(135deg, #f97316, #f59e0b)',
      'linear-gradient(135deg, #8b5cf6, #a855f7)',
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % gradients.length;
    return gradients[hash];
  }
}
