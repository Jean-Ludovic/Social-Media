import { Injectable } from '@nestjs/common';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  private messages: Message[] = [];

  async getConversations(userId: string) {
    const involved = this.messages.filter(
      (m) => m.senderId === userId || m.receiverId === userId,
    );
    const partners = new Set(
      involved.map((m) => (m.senderId === userId ? m.receiverId : m.senderId)),
    );
    return Array.from(partners).map((partnerId) => ({
      partnerId,
      lastMessage: involved
        .filter((m) => m.senderId === partnerId || m.receiverId === partnerId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0],
    }));
  }

  async getConversation(userId: string, partnerId: string): Promise<Message[]> {
    return this.messages
      .filter(
        (m) =>
          (m.senderId === userId && m.receiverId === partnerId) ||
          (m.senderId === partnerId && m.receiverId === userId),
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async send(senderId: string, receiverId: string, dto: CreateMessageDto): Promise<Message> {
    const message: Message = {
      id: Date.now().toString(),
      senderId,
      receiverId,
      content: dto.content,
      readAt: null,
      createdAt: new Date(),
    };
    this.messages.push(message);
    return message;
  }
}
