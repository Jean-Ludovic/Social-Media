import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  NotificationItem,
  NotificationType,
  NotificationsService,
} from '../../core/services/notifications';

const TYPE_META: Record<NotificationType, { label: string; classes: string }> = {
  friend_request: { label: "Demande d'ami", classes: 'bg-indigo-50 text-indigo-700' },
  message:        { label: 'Message',       classes: 'bg-blue-50 text-blue-700' },
  like:           { label: 'Réaction',      classes: 'bg-pink-50 text-pink-700' },
  comment:        { label: 'Commentaire',   classes: 'bg-amber-50 text-amber-700' },
  debate:         { label: 'Débat',         classes: 'bg-violet-50 text-violet-700' },
  live:           { label: 'Live',          classes: 'bg-red-50 text-red-700' },
};

@Component({
  selector: 'app-notifications',
  imports: [],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class Notifications implements OnInit {
  private readonly router = inject(Router);
  readonly service        = inject(NotificationsService);

  notifications = signal<NotificationItem[]>([]);
  loading       = signal(true);
  error         = signal('');
  actionError   = signal('');
  busyIds       = signal<Set<string>>(new Set());
  markingAll    = signal(false);

  readonly hasUnread = computed(() => this.notifications().some((n) => !n.read));

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.service.list().subscribe({
      next:  (list) => { this.notifications.set(list);                                   this.loading.set(false); },
      error: ()     => { this.error.set('Impossible de charger les notifications.'); this.loading.set(false); },
    });
  }

  markRead(notification: NotificationItem, event?: Event) {
    event?.stopPropagation();
    if (notification.read || this.isBusy(notification.id)) return;
    this.setBusy(notification.id, true);
    this.actionError.set('');

    this.service.markRead(notification).subscribe({
      next: () => {
        this.notifications.update((list) => list.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
        this.setBusy(notification.id, false);
      },
      error: () => {
        this.actionError.set('Action impossible. Réessayez.');
        this.setBusy(notification.id, false);
      },
    });
  }

  remove(notification: NotificationItem, event: Event) {
    event.stopPropagation();
    if (this.isBusy(notification.id)) return;
    this.setBusy(notification.id, true);
    this.actionError.set('');

    this.service.remove(notification).subscribe({
      next: () => {
        this.notifications.update((list) => list.filter((n) => n.id !== notification.id));
        this.setBusy(notification.id, false);
      },
      error: () => {
        this.actionError.set('Suppression impossible. Réessayez.');
        this.setBusy(notification.id, false);
      },
    });
  }

  markAllRead() {
    if (!this.hasUnread() || this.markingAll()) return;
    this.markingAll.set(true);
    this.actionError.set('');

    this.service.markAllRead().subscribe({
      next: () => {
        this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
        this.markingAll.set(false);
      },
      error: () => {
        this.actionError.set('Action impossible. Réessayez.');
        this.markingAll.set(false);
      },
    });
  }

  /** relatedId contract is documented on the backend NotificationsService. like/comment have no post page yet. */
  targetUrl(notification: NotificationItem): string | null {
    switch (notification.type) {
      case 'friend_request': return '/friends';
      case 'message':        return notification.relatedId ? `/messages/${notification.relatedId}` : '/messages';
      case 'debate':         return notification.relatedId ? `/debates/${notification.relatedId}` : null;
      case 'live':           return '/lives';
      default:               return null;
    }
  }

  open(notification: NotificationItem) {
    const url = this.targetUrl(notification);
    if (!url) return;
    if (!notification.read) this.markRead(notification);
    this.router.navigateByUrl(url);
  }

  typeLabel(type: NotificationType): string {
    return TYPE_META[type]?.label ?? type;
  }

  typeClasses(type: NotificationType): string {
    return TYPE_META[type]?.classes ?? 'bg-gray-50 text-gray-700';
  }

  isBusy(id: string): boolean {
    return this.busyIds().has(id);
  }

  private setBusy(id: string, busy: boolean) {
    this.busyIds.update((set) => {
      const next = new Set(set);
      if (busy) next.add(id); else next.delete(id);
      return next;
    });
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
