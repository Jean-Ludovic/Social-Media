import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../core/services/api';
import { AuthService } from '../../core/services/auth';

interface ConversationParticipant {
  userId: string;
  displayName: string;
}

interface ConversationSummary {
  conversationId: string;
  participants: ConversationParticipant[];
  lastMessageAt: string | null;
}

interface ConversationListItem extends ConversationSummary {
  partner: ConversationParticipant;
}

interface MessageItem {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

@Component({
  selector: 'app-messages',
  imports: [FormsModule, RouterLink],
  templateUrl: './messages.html',
  styleUrl: './messages.scss',
})
export class Messages implements OnInit {
  private readonly api    = inject(ApiService);
  private readonly auth   = inject(AuthService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly avatarGradients = [
    'linear-gradient(135deg, #ec4899, #f43f5e)',
    'linear-gradient(135deg, #3b82f6, #06b6d4)',
    'linear-gradient(135deg, #22c55e, #10b981)',
    'linear-gradient(135deg, #f97316, #f59e0b)',
    'linear-gradient(135deg, #8b5cf6, #a855f7)',
  ];

  conversations       = signal<ConversationListItem[]>([]);
  activeMessages       = signal<MessageItem[]>([]);
  activePartnerId      = signal<string | null>(null);
  loadingConversations = signal(true);
  loadingMessages       = signal(false);
  error                 = signal('');

  newMessage = '';
  sending    = signal(false);
  sendError  = signal('');

  /** Partner opened by URL with no conversation yet (e.g. from the friends list). */
  draftPartner = signal<ConversationParticipant | null>(null);

  private get currentUserId(): string {
    return this.auth.currentUser()?.id ?? '';
  }

  activeConversation = computed<ConversationListItem | null>(() => {
    const partnerId = this.activePartnerId();
    const existing = this.conversations().find((c) => c.partner.userId === partnerId);
    if (existing) return existing;
    const draft = this.draftPartner();
    return draft && draft.userId === partnerId
      ? { conversationId: '', participants: [], lastMessageAt: null, partner: draft }
      : null;
  });

  ngOnInit() {
    this.loadConversations();
    const partnerId = this.route.snapshot.paramMap.get('conversationId');
    if (partnerId) this.openConversation(partnerId);
  }

  loadConversations() {
    this.loadingConversations.set(true);
    this.api.get<ConversationSummary[]>('/messages/conversations').subscribe({
      next: (list) => {
        const me = this.currentUserId;
        this.conversations.set(
          list
            .map((c) => ({ ...c, partner: c.participants.find((p) => p.userId !== me) }))
            .filter((c): c is ConversationListItem => !!c.partner),
        );
        this.loadingConversations.set(false);
        this.resolveDraftPartner();
      },
      error: () => {
        this.error.set('Impossible de charger vos conversations.');
        this.loadingConversations.set(false);
      },
    });
  }

  private resolveDraftPartner() {
    const partnerId = this.activePartnerId();
    if (!partnerId || this.conversations().some((c) => c.partner.userId === partnerId)) return;
    if (this.draftPartner()?.userId === partnerId) return;

    this.api.get<{ id: string; displayName: string }>(`/users/${partnerId}`).subscribe({
      next:  (user) => this.draftPartner.set({ userId: user.id, displayName: user.displayName }),
      error: () => { /* unknown user: the empty-state panel stays displayed */ },
    });
  }

  openConversation(partnerId: string) {
    this.sendError.set('');
    this.activePartnerId.set(partnerId);
    this.loadingMessages.set(true);
    this.router.navigate(['/messages', partnerId]);

    this.api.get<MessageItem[]>(`/messages/${partnerId}`).subscribe({
      next: (msgs) => {
        this.activeMessages.set(msgs);
        this.loadingMessages.set(false);
        this.markUnreadAsRead(msgs);
      },
      error: () => {
        this.error.set('Impossible de charger cette conversation.');
        this.loadingMessages.set(false);
      },
    });
  }

  private markUnreadAsRead(msgs: MessageItem[]) {
    const me = this.currentUserId;
    for (const msg of msgs) {
      if (msg.senderId !== me && !msg.readAt) {
        this.api.patch(`/messages/${msg.id}/read`, {}).subscribe();
      }
    }
  }

  sendMessage() {
    const content = this.newMessage.trim();
    const partnerId = this.activePartnerId();
    if (!content || !partnerId || this.sending()) return;

    this.sending.set(true);
    this.sendError.set('');
    this.api.post<MessageItem>(`/messages/${partnerId}`, { content }).subscribe({
      next: (msg) => {
        this.activeMessages.update((list) => [...list, msg]);
        this.newMessage = '';
        this.sending.set(false);
        this.loadConversations();
      },
      error: (err: HttpErrorResponse) => {
        this.sendError.set(err.status === 403
          ? 'Vous ne pouvez écrire qu\'à vos amis.'
          : "Le message n'a pas pu être envoyé. Réessayez.");
        this.sending.set(false);
      },
    });
  }

  isMine(msg: MessageItem): boolean {
    return msg.senderId === this.currentUserId;
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  initials(name: string): string {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '??';
  }

  avatarColor(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % this.avatarGradients.length;
    return this.avatarGradients[hash];
  }

  formatLastMessageAt(iso: string | null): string {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}j`;
  }

  messageTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}
