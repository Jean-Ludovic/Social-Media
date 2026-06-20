import { Component, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Conversation {
  id: string;
  name: string;
  initials: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
}

interface Message {
  id: string;
  content: string;
  sentAt: string;
  isMine: boolean;
}

@Component({
  selector: 'app-messages',
  imports: [FormsModule],
  templateUrl: './messages.html',
  styleUrl: './messages.scss',
})
export class Messages {
  newMessage = '';
  activeConversationId = signal<string | null>('1');

  private readonly avatarGradients = [
    'linear-gradient(135deg, #ec4899, #f43f5e)',
    'linear-gradient(135deg, #3b82f6, #06b6d4)',
    'linear-gradient(135deg, #22c55e, #10b981)',
    'linear-gradient(135deg, #f97316, #f59e0b)',
    'linear-gradient(135deg, #8b5cf6, #a855f7)',
  ];

  conversations: Conversation[] = [
    { id: '1', name: 'Alice Martin',   initials: 'AM', lastMessage: 'Tu as vu le dernier débat ?',      time: '14:32', unread: 3, online: true },
    { id: '2', name: 'Bob Dupont',     initials: 'BD', lastMessage: 'Super idée !',                     time: '13:15', unread: 0, online: false },
    { id: '3', name: 'Clara Fontaine', initials: 'CF', lastMessage: 'On se retrouve ce soir ?',          time: '11:58', unread: 1, online: true },
    { id: '4', name: 'David Leclerc',  initials: 'DL', lastMessage: 'Merci pour le partage !',           time: 'Hier',  unread: 0, online: false },
    { id: '5', name: 'Emma Rousseau',  initials: 'ER', lastMessage: 'Le live était excellent 🔥',        time: 'Hier',  unread: 0, online: true },
  ];

  messages: Record<string, Message[]> = {
    '1': [
      { id: '1', content: 'Salut ! Comment tu vas ?',                                                    sentAt: '14:28', isMine: false },
      { id: '2', content: 'Très bien merci, et toi ?',                                                   sentAt: '14:29', isMine: true },
      { id: '3', content: 'Super ! Tu as vu le dernier débat ?',                                         sentAt: '14:30', isMine: false },
      { id: '4', content: "Pas encore, c'était sur quoi ?",                                              sentAt: '14:31', isMine: true },
      { id: '5', content: 'Sur la tech et la société, vraiment intéressant. Tu devrais regarder !',      sentAt: '14:32', isMine: false },
    ],
    '2': [
      { id: '1', content: "Hey, j'ai eu ton message.",  sentAt: '13:10', isMine: false },
      { id: '2', content: 'Super idée !',               sentAt: '13:15', isMine: false },
    ],
    '3': [
      { id: '1', content: 'On se retrouve ce soir ?',   sentAt: '11:58', isMine: false },
    ],
  };

  activeConversation = computed(() =>
    this.conversations.find(c => c.id === this.activeConversationId()) ?? null
  );

  activeMessages = computed(() => {
    const id = this.activeConversationId();
    return id ? (this.messages[id] ?? []) : [];
  });

  avatarStyle(id: string): string {
    const idx = (parseInt(id, 10) - 1) % this.avatarGradients.length;
    return this.avatarGradients[idx];
  }

  selectConversation(id: string) {
    this.activeConversationId.set(id);
    const conv = this.conversations.find(c => c.id === id);
    if (conv) conv.unread = 0;
  }

  sendMessage() {
    const text = this.newMessage.trim();
    if (!text) return;
    const id = this.activeConversationId();
    if (!id) return;

    if (!this.messages[id]) this.messages[id] = [];
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this.messages[id].push({ id: Date.now().toString(), content: text, sentAt: now, isMine: true });
    const conv = this.conversations.find(c => c.id === id);
    if (conv) { conv.lastMessage = text; conv.time = 'maintenant'; }
    this.newMessage = '';
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
