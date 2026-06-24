import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

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

  private async listMessages(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: messageSelect,
    });
  }

  async getMessagesWithPartner(userId: string, partnerId: string) {
    const conversation = await this.findPrivateConversation(userId, partnerId);
    if (!conversation) return [];
    return this.listMessages(conversation.id, userId);
  }

  async sendToPartner(senderId: string, receiverId: string, dto: CreateMessageDto) {
    const conversation = await this.getOrCreatePrivateConversation(senderId, receiverId);
    return this.send(conversation.id, senderId, dto);
  }

  async send(conversationId: string, senderId: string, dto: CreateMessageDto) {
    await this.assertParticipant(conversationId, senderId);

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
