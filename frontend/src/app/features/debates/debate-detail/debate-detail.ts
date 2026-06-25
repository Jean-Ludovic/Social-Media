import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api';

interface DebateSide {
  id: string;
  label: string;
  votesCount: number;
}

interface DebateData {
  id: string;
  authorId: string;
  authorName: string;
  question: string;
  sides: DebateSide[];
  createdAt: string;
  totalVotes: number;
  hasVoted: boolean;
  myVoteSideId: string | null;
}

@Component({
  selector: 'app-debate-detail',
  imports: [],
  templateUrl: './debate-detail.html',
  styleUrl: './debate-detail.scss',
})
export class DebateDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api   = inject(ApiService);

  debate  = signal<DebateData | null>(null);
  loading = signal(true);
  error   = signal('');
  voting  = signal(false);

  votedSideId(): string | null {
    return this.debate()?.myVoteSideId ?? null;
  }

  totalVotes(): number {
    return this.debate()?.totalVotes ?? 0;
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadDebate(id);
  }

  private loadDebate(id: string) {
    this.loading.set(true);
    this.error.set('');
    this.api.get<DebateData>(`/debates/${id}`).subscribe({
      next:  (debate) => { this.debate.set(debate); this.loading.set(false); },
      error: (err)    => {
        this.error.set(err.status === 404 ? 'Ce débat est introuvable.' : 'Impossible de charger ce débat.');
        this.loading.set(false);
      },
    });
  }

  vote(sideId: string) {
    if (this.votedSideId() || this.voting()) return;
    const debateId = this.debate()?.id;
    if (!debateId) return;

    this.voting.set(true);
    this.api.post<DebateData>(`/debates/${debateId}/vote/${sideId}`, {}).subscribe({
      next: (updated) => {
        this.debate.set(updated);
        this.voting.set(false);
      },
      error: () => {
        this.voting.set(false);
      },
    });
  }

  pct(side: DebateSide): number {
    const total = this.totalVotes();
    if (total === 0) return 50;
    return Math.round((side.votesCount / total) * 100);
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
