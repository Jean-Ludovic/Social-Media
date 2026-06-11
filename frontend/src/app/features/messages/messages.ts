import { Component, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

interface Conversation {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
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
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './messages.html',
  styleUrl: './messages.scss',
})
export class Messages {
  private route = inject(ActivatedRoute);

  newMessage = signal('');
  activeConversationId = signal<string | null>('1');

  conversations: Conversation[] = [
    { id: '1', name: 'Alice Martin',   initials: 'AM', avatarColor: 'from-pink-500 to-rose-500',     lastMessage: 'Tu as vu le dernier débat ?',      time: '14:32', unread: 3, online: true },
    { id: '2', name: 'Bob Dupont',     initials: 'BD', avatarColor: 'from-blue-500 to-cyan-500',     lastMessage: 'Super idée !',                     time: '13:15', unread: 0, online: false },
    { id: '3', name: 'Clara Fontaine', initials: 'CF', avatarColor: 'from-green-500 to-emerald-500', lastMessage: 'On se retrouve ce soir ?',          time: '11:58', unread: 1, online: true },
    { id: '4', name: 'David Leclerc',  initials: 'DL', avatarColor: 'from-orange-500 to-amber-500',  lastMessage: 'Merci pour le partage !',           time: 'Hier',  unread: 0, online: false },
    { id: '5', name: 'Emma Rousseau',  initials: 'ER', avatarColor: 'from-violet-500 to-purple-500', lastMessage: 'Le live était excellent 🔥',         time: 'Hier',  unread: 0, online: true },
  ];

  messages: Record<string, Message[]> = {
    '1': [
      { id: '1', content: 'Salut ! Comment tu vas ?',            sentAt: '14:28', isMine: false },
      { id: '2', content: 'Très bien merci, et toi ?',           sentAt: '14:29', isMine: true },
      { id: '3', content: 'Super ! Tu as vu le dernier débat ?', sentAt: '14:30', isMine: false },
      { id: '4', content: 'Pas encore, c\'était sur quoi ?',     sentAt: '14:31', isMine: true },
      { id: '5', content: 'Sur la tech et la société, vraiment intéressant. Tu devrais regarder !', sentAt: '14:32', isMine: false },
    ],
    '2': [
      { id: '1', content: 'Hey, j\'ai eu ton message.',     sentAt: '13:10', isMine: false },
      { id: '2', content: 'Super idée !',                   sentAt: '13:15', isMine: false },
    ],
    '3': [
      { id: '1', content: 'Alors, on se retrouve ce soir ?', sentAt: '11:58', isMine: false },
    ],
  };

  activeConversation = computed(() => {
    const id = this.activeConversationId();
    return this.conversations.find(c => c.id === id) ?? null;
  });

  activeMessages = computed(() => {
    const id = this.activeConversationId();
    return id ? (this.messages[id] ?? []) : [];
  });

  selectConversation(id: string) {
    this.activeConversationId.set(id);
    const conv = this.conversations.find(c => c.id === id);
    if (conv) conv.unread = 0;
  }

  sendMessage() {
    const text = this.newMessage().trim();
    if (!text) return;
    const id = this.activeConversationId();
    if (!id) return;

    if (!this.messages[id]) this.messages[id] = [];
    this.messages[id].push({
      id: Date.now().toString(),
      content: text,
      sentAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      isMine: true,
    });
    const conv = this.conversations.find(c => c.id === id);
    if (conv) { conv.lastMessage = text; conv.time = 'maintenant'; }
    this.newMessage.set('');
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
