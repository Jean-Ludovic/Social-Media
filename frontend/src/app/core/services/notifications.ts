import { Injectable, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs/operators';
import { ApiService } from './api';

export type NotificationType = 'friend_request' | 'message' | 'like' | 'comment' | 'debate' | 'live';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  relatedId: string | null;
  read: boolean;
  createdAt: string;
}

/** Holds the unread counter shared by the sidebar badge and the notifications page. */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(ApiService);

  readonly unreadCount = signal(0);
  readonly badgeLabel  = computed(() => {
    const n = this.unreadCount();
    return n > 99 ? '99+' : String(n);
  });

  refreshUnreadCount() {
    this.api.get<{ unreadCount: number }>('/notifications/unread-count').subscribe({
      next:  (res) => this.unreadCount.set(res.unreadCount),
      error: () => { /* keep the previous value — the badge is non-critical */ },
    });
  }

  list() {
    return this.api.get<NotificationItem[]>('/notifications').pipe(
      tap((list) => this.unreadCount.set(list.filter((n) => !n.read).length)),
    );
  }

  markRead(notification: NotificationItem) {
    return this.api.patch<NotificationItem>(`/notifications/${notification.id}/read`, {}).pipe(
      tap(() => { if (!notification.read) this.decrement(); }),
    );
  }

  markAllRead() {
    return this.api.patch<void>('/notifications/read-all', {}).pipe(
      tap(() => this.unreadCount.set(0)),
    );
  }

  remove(notification: NotificationItem) {
    return this.api.delete<void>(`/notifications/${notification.id}`).pipe(
      tap(() => { if (!notification.read) this.decrement(); }),
    );
  }

  private decrement() {
    this.unreadCount.update((n) => Math.max(0, n - 1));
  }
}
