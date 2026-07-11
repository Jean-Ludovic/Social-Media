import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/services/api';
import { AuthService } from '../../core/services/auth';

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

interface DebateItem {
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

type DebateFilter = 'popular' | 'new' | 'unvoted' | 'voted' | 'mine';

const FILTERS: { value: DebateFilter; label: string }[] = [
  { value: 'popular', label: 'Populaires' },
  { value: 'new',     label: 'Nouveaux' },
  { value: 'unvoted', label: 'À voter' },
  { value: 'voted',   label: 'Déjà votés' },
  { value: 'mine',    label: 'Mes débats' },
];

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
const MAX_NEW_DEBATE_TAGS = 5;

@Component({
  selector: 'app-debates',
  imports: [FormsModule],
  templateUrl: './debates.html',
  styleUrl: './debates.scss',
})
export class Debates implements OnInit {
  private readonly api    = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  readonly auth           = inject(AuthService);

  debates      = signal<DebateItem[]>([]);
  loading      = signal(true);
  error        = signal('');
  showComposer = signal(false);
  posting      = signal(false);
  postError    = '';

  categories = signal<Category[]>([]);
  tags       = signal<Tag[]>([]);

  newQuestion    = '';
  sideA          = 'Pour';
  sideB          = 'Contre';
  newCategoryId  = '';
  newTagIds      = signal<Set<string>>(new Set());

  readonly filters = FILTERS;
  activeFilter     = signal<DebateFilter>('new');
  searchQuery      = '';
  authorQuery      = '';
  selectedCategory = signal('');
  selectedTags     = signal<Set<string>>(new Set());

  private searchTimeout?: ReturnType<typeof setTimeout>;
  private authorTimeout?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.loadFilterOptions();
    this.route.queryParams.subscribe((params) => {
      this.activeFilter.set((params['filter'] as DebateFilter) || 'new');
      this.searchQuery = params['q'] ?? '';
      this.authorQuery = params['author'] ?? '';
      this.selectedCategory.set(params['category'] ?? '');
      this.selectedTags.set(new Set(params['tag'] ? String(params['tag']).split(',').filter(Boolean) : []));
      this.loadDebates();
    });
  }

  private loadFilterOptions() {
    this.api.get<Category[]>('/categories').subscribe({ next: (list) => this.categories.set(list) });
    this.api.get<Tag[]>('/tags').subscribe({ next: (list) => this.tags.set(list) });
  }

  loadDebates() {
    this.loading.set(true);
    this.error.set('');

    const params = new URLSearchParams();
    params.set('filter', this.activeFilter());
    if (this.searchQuery.trim())       params.set('q', this.searchQuery.trim());
    if (this.authorQuery.trim())       params.set('author', this.authorQuery.trim());
    if (this.selectedCategory())       params.set('category', this.selectedCategory());
    if (this.selectedTags().size > 0)  params.set('tag', Array.from(this.selectedTags()).join(','));

    this.api.get<DebateItem[]>(`/debates?${params.toString()}`).subscribe({
      next:  (list) => { this.debates.set(list);                                          this.loading.set(false); },
      error: ()     => { this.error.set('Impossible de charger les débats. Réessayez.'); this.loading.set(false); },
    });
  }

  private updateQueryParams(patch: Record<string, string | null>) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: patch,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  selectFilter(filter: DebateFilter) {
    if (this.activeFilter() === filter) return;
    this.updateQueryParams({ filter });
  }

  onSearchInput() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.updateQueryParams({ q: this.searchQuery.trim() || null }), 300);
  }

  onAuthorInput() {
    clearTimeout(this.authorTimeout);
    this.authorTimeout = setTimeout(() => this.updateQueryParams({ author: this.authorQuery.trim() || null }), 300);
  }

  selectCategory(slug: string) {
    this.updateQueryParams({ category: slug || null });
  }

  toggleTag(slug: string) {
    const next = new Set(this.selectedTags());
    if (next.has(slug)) next.delete(slug); else next.add(slug);
    this.updateQueryParams({ tag: next.size > 0 ? Array.from(next).join(',') : null });
  }

  toggleComposer() {
    const next = !this.showComposer();
    this.showComposer.set(next);
    if (!next) {
      this.newQuestion = '';
      this.sideA = 'Pour';
      this.sideB = 'Contre';
      this.newCategoryId = '';
      this.newTagIds.set(new Set());
      this.postError = '';
    }
  }

  toggleNewTag(id: string) {
    const next = new Set(this.newTagIds());
    if (next.has(id)) {
      next.delete(id);
    } else if (next.size < MAX_NEW_DEBATE_TAGS) {
      next.add(id);
    }
    this.newTagIds.set(next);
  }

  submitDebate() {
    const question = this.newQuestion.trim();
    const sideALabel = this.sideA.trim();
    const sideBLabel = this.sideB.trim();
    if (!question || !sideALabel || !sideBLabel) {
      this.postError = 'La question et les deux positions sont requises.';
      return;
    }
    if (!this.newCategoryId) {
      this.postError = 'Choisissez une catégorie pour ce débat.';
      return;
    }
    this.posting.set(true);
    this.postError = '';

    const payload = {
      question,
      sides: [sideALabel, sideBLabel],
      categoryId: this.newCategoryId,
      tagIds: Array.from(this.newTagIds()),
    };

    this.api.post<DebateItem>('/debates', payload).subscribe({
      next: (debate) => {
        this.debates.update(list => [debate, ...list]);
        this.newQuestion = '';
        this.sideA = 'Pour';
        this.sideB = 'Contre';
        this.newCategoryId = '';
        this.newTagIds.set(new Set());
        this.posting.set(false);
        this.showComposer.set(false);
      },
      error: () => {
        this.postError = 'Erreur lors de la création. Réessayez.';
        this.posting.set(false);
      },
    });
  }

  openDetail(id: string) {
    this.router.navigate(['/debates', id]);
  }

  pct(side: DebateSide, debate: DebateItem): number {
    if (debate.totalVotes === 0) return 50;
    return Math.round((side.votesCount / debate.totalVotes) * 100);
  }

  categoryClasses(color: string) {
    return CATEGORY_COLOR_CLASSES[color] ?? FALLBACK_CATEGORY_CLASSES;
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
