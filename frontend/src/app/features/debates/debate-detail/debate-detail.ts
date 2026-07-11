import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api';
import { BackButton } from '../../../core/components/back-button/back-button';
import { Breadcrumb, BreadcrumbItem } from '../../../core/components/breadcrumb/breadcrumb';

interface DebateSide {
  id: string;
  label: string;
  votesCount: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string | null;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
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
  category: Category | null;
  tags: Tag[];
}

const CATEGORY_COLOR_CLASSES: Record<string, { bg: string; text: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700' },
  red:     { bg: 'bg-red-50',     text: 'text-red-700' },
  green:   { bg: 'bg-green-50',   text: 'text-green-700' },
  pink:    { bg: 'bg-pink-50',    text: 'text-pink-700' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700' },
  stone:   { bg: 'bg-stone-50',   text: 'text-stone-700' },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700' },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-700' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700' },
  yellow:  { bg: 'bg-yellow-50',  text: 'text-yellow-700' },
  slate:   { bg: 'bg-slate-50',   text: 'text-slate-700' },
  sky:     { bg: 'bg-sky-50',     text: 'text-sky-700' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700' },
  fuchsia: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  teal:    { bg: 'bg-teal-50',    text: 'text-teal-700' },
  lime:    { bg: 'bg-lime-50',    text: 'text-lime-700' },
  zinc:    { bg: 'bg-zinc-50',    text: 'text-zinc-700' },
  gray:    { bg: 'bg-gray-50',    text: 'text-gray-700' },
};
const FALLBACK_CATEGORY_CLASSES = { bg: 'bg-gray-50', text: 'text-gray-700' };

@Component({
  selector: 'app-debate-detail',
  imports: [BackButton, Breadcrumb],
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

  breadcrumb(): BreadcrumbItem[] {
    const question = this.debate()?.question ?? 'Débat';
    return [
      { label: 'Accueil', link: '/feed' },
      { label: 'Débats', link: '/debates' },
      { label: question.length > 40 ? question.slice(0, 40) + '…' : question },
    ];
  }

  categoryClasses(color: string) {
    return CATEGORY_COLOR_CLASSES[color] ?? FALLBACK_CATEGORY_CLASSES;
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
