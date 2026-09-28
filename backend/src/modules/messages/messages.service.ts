import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FriendshipsService } from '../friendships/friendships.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMessageDto } from './dto/create-message.dto';

const messageSelect = {
  id: true,
  senderId: true,
  content: true,
  createdAt: true,
  readAt: true,
} as const;

const participantsInclude = {
  participants: { include: { user: { select: { id: true, displayName: true } } } },
} as const;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friendships: FriendshipsService,
    private readonly notifications: NotificationsService,
  ) {}

  private async assertFriends(userId: string, partnerId: string) {
    if (!(await this.friendships.areFriends(userId, partnerId))) {
      throw new ForbiddenException('Private messages are only allowed between accepted friends');
    }
  }

  /**
   * Returns the existing 1-to-1 conversation between the two users, or null.
   * A conversation only counts as "private" between A and B if it has exactly 2 participants.
   */
  private async findPrivateConversation(userIdA: string, userIdB: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: userIdA } } },
          { participants: { some: { userId: userIdB } } },
        ],
      },
      include: participantsInclude,
    });
    return conversation && conversation.participants.length === 2 ? conversation : null;
  }

  /** Reusable by other modules (chat, notifications, realtime) to resolve a 1-to-1 conversation. */
  async getOrCreatePrivateConversation(userIdA: string, userIdB: string) {
    if (userIdA === userIdB) {
      throw new ForbiddenException('Cannot start a conversation with yourself');
    }
    await this.assertFriends(userIdA, userIdB);

    const existing = await this.findPrivateConversation(userIdA, userIdB);
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: { participants: { create: [{ userId: userIdA }, { userId: userIdB }] } },
      include: participantsInclude,
    });
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('Not a participant in this conversation');
  }

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: participantsInclude,
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
    });

    return conversations.map((c) => ({
      conversationId: c.id,
      participants: c.participants.map((p) => ({
        userId: p.userId,
        displayName: p.user.displayName,
      })),
      lastMessageAt: c.lastMessageAt,
    }));
  }

  /**
   * Read-only: never creates a conversation. History stays readable by its participants
   * even if the friendship is no longer accepted.
   */
  async getMessagesWithPartner(userId: string, partnerId: string) {
    const conversation = await this.findPrivateConversation(userId, partnerId);
    if (!conversation) return [];

    return this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      select: messageSelect,
    });
  }

  async sendToPartner(senderId: string, receiverId: string, dto: CreateMessageDto) {
    const conversation = await this.getOrCreatePrivateConversation(senderId, receiverId);
    return this.writeMessage(conversation.id, senderId, dto, [receiverId]);
  }

  /** Sending requires being a participant AND still being an accepted friend of every other participant. */
  async send(conversationId: string, senderId: string, dto: CreateMessageDto) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    if (!participants.some((p) => p.userId === senderId)) {
      throw new ForbiddenException('Not a participant in this conversation');
    }
    const recipientIds = participants.map((p) => p.userId).filter((id) => id !== senderId);
    for (const userId of recipientIds) {
      await this.assertFriends(senderId, userId);
    }

    return this.writeMessage(conversationId, senderId, dto, recipientIds);
  }

  /** No authorization here: callers must have checked participation and friendship. */
  private async writeMessage(
    conversationId: string,
    senderId: string,
    dto: CreateMessageDto,
    recipientIds: string[],
  ) {
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId, senderId, content: dto.content },
        select: messageSelect,
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    const sender = await this.prisma.user.findUnique({ where: { id: senderId }, select: { displayName: true } });
    for (const recipientId of recipientIds) {
      await this.notifications.notify(
        recipientId,
        'message',
        `${sender?.displayName ?? "Quelqu'un"} vous a envoyé un message.`,
        senderId,
        { skipIfUnread: true },
      );
    }

    return message;
  }

  async markAsRead(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');

    await this.assertParticipant(message.conversationId, userId);

    return this.prisma.message.update({
      where: { id: messageId },
      data: { readAt: new Date() },
      select: messageSelect,
    });
  }
}
