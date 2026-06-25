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

type RelationshipStatus = 'none' | 'accepted' | 'pending_sent' | 'pending_received' | 'rejected';

interface FriendSuggestion {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  relationshipStatus: RelationshipStatus;
}

@Component({
  selector: 'app-friends',
  imports: [FormsModule],
  templateUrl: './friends.html',
  styleUrl: './friends.scss',
})
export class Friends implements OnInit {
  private readonly api = inject(ApiService);

  friends = signal<FriendEntry[]>([]);
  pending = signal<PendingEntry[]>([]);
  loading = signal(true);
  error   = signal('');

  searchQuery  = '';
  searching    = signal(false);
  searchError  = signal('');
  suggestions  = signal<FriendSuggestion[]>([]);
  sendingId    = signal<string | null>(null);

  private searchTimeout?: ReturnType<typeof setTimeout>;

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

  onSearchInput() {
    clearTimeout(this.searchTimeout);
    const query = this.searchQuery.trim();
    if (query.length < 2) {
      this.suggestions.set([]);
      this.searchError.set('');
      return;
    }
    this.searchTimeout = setTimeout(() => this.runSearch(query), 300);
  }

  private runSearch(query: string) {
    this.searching.set(true);
    this.searchError.set('');
    this.api.get<FriendSuggestion[]>(`/friendships/search?q=${encodeURIComponent(query)}`).subscribe({
      next: (list) => { this.suggestions.set(list); this.searching.set(false); },
      error: () => {
        this.searchError.set('Erreur lors de la recherche. Réessayez.');
        this.searching.set(false);
      },
    });
  }

  addFriend(suggestion: FriendSuggestion) {
    if (this.sendingId()) return;
    this.sendingId.set(suggestion.id);

    this.api.post<unknown>(`/friendships/request/${suggestion.id}`, {}).subscribe({
      next: () => {
        this.suggestions.update((list) =>
          list.map((s) => (s.id === suggestion.id ? { ...s, relationshipStatus: 'pending_sent' as const } : s)),
        );
        this.sendingId.set(null);
        this.loadAll();
      },
      error: () => {
        this.sendingId.set(null);
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
