import { Injectable, NotFoundException } from '@nestjs/common';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  private notifications: Notification[] = [];

  async findAll(userId: string): Promise<Notification[]> {
    return this.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markRead(id: string): Promise<Notification> {
    const notif = this.notifications.find((n) => n.id === id);
    if (!notif) throw new NotFoundException('Notification not found');
    notif.read = true;
    return notif;
  }

  async markAllRead(userId: string): Promise<void> {
    this.notifications.filter((n) => n.userId === userId).forEach((n) => (n.read = true));
  }

  async create(data: {
    userId: string;
    type: NotificationType;
    message: string;
    relatedId?: string;
  }): Promise<Notification> {
    const notif: Notification = {
      id: Date.now().toString(),
      userId: data.userId,
      type: data.type,
      message: data.message,
      relatedId: data.relatedId ?? null,
      read: false,
      createdAt: new Date(),
    };
    this.notifications.push(notif);
    return notif;
  }
}
