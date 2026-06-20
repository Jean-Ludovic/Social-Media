import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api';
import { AuthService } from '../../core/services/auth';

interface DebateSide {
  id: string;
  label: string;
  votesCount: number;
}

interface DebateItem {
  id: string;
  authorId: string;
  authorName: string;
  question: string;
  sides: DebateSide[];
  createdAt: string;
}

@Component({
  selector: 'app-debates',
  imports: [FormsModule],
  templateUrl: './debates.html',
  styleUrl: './debates.scss',
})
export class Debates implements OnInit {
  private readonly api    = inject(ApiService);
  private readonly router = inject(Router);
  readonly auth           = inject(AuthService);

  debates      = signal<DebateItem[]>([]);
  loading      = signal(true);
  error        = signal('');
  showComposer = signal(false);
  posting      = signal(false);
  postError    = '';

  newQuestion = '';
  sideA       = 'Pour';
  sideB       = 'Contre';

  ngOnInit() {
    this.loadDebates();
  }

  loadDebates() {
    this.loading.set(true);
    this.error.set('');
    this.api.get<DebateItem[]>('/debates').subscribe({
      next:  (list) => { this.debates.set(list);                                          this.loading.set(false); },
      error: ()     => { this.error.set('Impossible de charger les débats. Réessayez.'); this.loading.set(false); },
    });
  }

  toggleComposer() {
    const next = !this.showComposer();
    this.showComposer.set(next);
    if (!next) {
      this.newQuestion = '';
      this.sideA = 'Pour';
      this.sideB = 'Contre';
      this.postError = '';
    }
  }

  submitDebate() {
    const question = this.newQuestion.trim();
    const sideALabel = this.sideA.trim();
    const sideBLabel = this.sideB.trim();
    if (!question || !sideALabel || !sideBLabel) {
      this.postError = 'La question et les deux positions sont requises.';
      return;
    }
    this.posting.set(true);
    this.postError = '';

    this.api.post<DebateItem>('/debates', { question, sides: [sideALabel, sideBLabel] }).subscribe({
      next: (debate) => {
        this.debates.update(list => [debate, ...list]);
        this.newQuestion = '';
        this.sideA = 'Pour';
        this.sideB = 'Contre';
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

  totalVotes(debate: DebateItem): number {
    return debate.sides.reduce((sum, s) => sum + s.votesCount, 0);
  }

  pct(side: DebateSide, debate: DebateItem): number {
    const total = this.totalVotes(debate);
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
