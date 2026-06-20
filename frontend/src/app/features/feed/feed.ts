import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api';
import { AuthService } from '../../core/services/auth';

interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  imageUrl: string | null;
  type: 'post' | 'debate';
  createdAt: string;
}

@Component({
  selector: 'app-feed',
  imports: [FormsModule],
  templateUrl: './feed.html',
  styleUrl: './feed.scss',
})
export class Feed implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth        = inject(AuthService);

  posts   = signal<FeedPost[]>([]);
  loading = signal(true);
  error   = signal('');

  newPostContent = '';
  posting        = signal(false);
  postError      = '';

  ngOnInit() {
    this.loadPosts();
  }

  loadPosts() {
    this.loading.set(true);
    this.error.set('');
    this.api.get<FeedPost[]>('/posts').subscribe({
      next:  (posts) => { this.posts.set(posts);                         this.loading.set(false); },
      error: ()      => { this.error.set('Impossible de charger le fil. Réessayez.'); this.loading.set(false); },
    });
  }

  submitPost() {
    const content = this.newPostContent.trim();
    if (!content || this.posting()) return;
    this.posting.set(true);
    this.postError = '';

    this.api.post<FeedPost>('/posts', { content }).subscribe({
      next: (post) => {
        this.posts.update(list => [post, ...list]);
        this.newPostContent = '';
        this.posting.set(false);
      },
      error: () => {
        this.postError = 'Erreur lors de la publication. Réessayez.';
        this.posting.set(false);
      },
    });
  }

  deletePost(id: string) {
    this.api.delete<void>(`/posts/${id}`).subscribe({
      next:  () => this.posts.update(list => list.filter(p => p.id !== id)),
      error: () => { /* post stays in list — user can retry */ },
    });
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitPost();
    }
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
