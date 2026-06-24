import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const notificationSelect = {
  id: true,
  type: true,
  message: true,
  relatedId: true,
  read: true,
  createdAt: true,
} as const;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Internal, reusable from any service (e.g. FriendshipsService, MessagesService)
   * to push a notification to a user. Never exposed directly over HTTP.
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    message: string,
    relatedId?: string,
  ) {
    return this.prisma.notification.create({
      data: { userId, type, message, relatedId: relatedId ?? null },
      select: notificationSelect,
    });
  }

  async findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: notificationSelect,
    });
  }

  async countUnread(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { unreadCount };
  }

  private async assertOwner(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) throw new ForbiddenException('Not allowed');
    return notification;
  }

  async markRead(id: string, userId: string) {
    await this.assertOwner(id, userId);
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
      select: notificationSelect,
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.assertOwner(id, userId);
    await this.prisma.notification.delete({ where: { id } });
  }
}
