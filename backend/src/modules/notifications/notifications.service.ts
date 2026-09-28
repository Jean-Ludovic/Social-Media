import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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

/**
 * relatedId contract, per notification type (the frontend navigates from it):
 * - friend_request → friendship id   (/friends)
 * - message        → sender user id  (/messages/:senderId)
 * - debate         → debate post id  (/debates/:id)
 * - live           → live id         (/lives)
 * - like / comment → post id         (no post page yet)
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Side-effect notification for a business action that has already been persisted.
   * Never throws: a failed notification must not turn a successful action into an error.
   * With `skipIfUnread`, nothing is created when the recipient still has an unread
   * notification of the same type and relatedId (avoids one notification per chat message).
   */
  async notify(
    userId: string,
    type: NotificationType,
    message: string,
    relatedId: string,
    options: { skipIfUnread?: boolean } = {},
  ): Promise<void> {
    try {
      if (options.skipIfUnread) {
        const pending = await this.prisma.notification.findFirst({
          where: { userId, type, relatedId, read: false },
          select: { id: true },
        });
        if (pending) return;
      }
      await this.prisma.notification.create({ data: { userId, type, message, relatedId } });
    } catch (error) {
      this.logger.warn(`Failed to create ${type} notification for user ${userId}: ${(error as Error).message}`);
    }
  }

  /** Same guarantees as notify(), for several recipients in one insert. */
  async notifyMany(userIds: string[], type: NotificationType, message: string, relatedId: string): Promise<void> {
    if (userIds.length === 0) return;
    try {
      await this.prisma.notification.createMany({
        data: userIds.map((userId) => ({ userId, type, message, relatedId })),
      });
    } catch (error) {
      this.logger.warn(`Failed to create ${type} notifications for ${userIds.length} users: ${(error as Error).message}`);
    }
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
