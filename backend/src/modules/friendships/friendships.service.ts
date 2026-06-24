import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { FriendshipStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface FriendEntry {
  friendshipId: string;
  friendId: string;
  friendName: string;
}

export interface PendingEntry {
  friendshipId: string;
  requesterId: string;
  requesterName: string;
}

const displayNameSelect = { select: { displayName: true } } as const;

@Injectable()
export class FriendshipsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFriendsEnriched(userId: string): Promise<FriendEntry[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      include: { requester: displayNameSelect, receiver: displayNameSelect },
    });

    return friendships.map((f) => {
      const isRequester = f.requesterId === userId;
      return {
        friendshipId: f.id,
        friendId: isRequester ? f.receiverId : f.requesterId,
        friendName: isRequester ? f.receiver.displayName : f.requester.displayName,
      };
    });
  }

  async getPendingEnriched(userId: string): Promise<PendingEntry[]> {
    const pending = await this.prisma.friendship.findMany({
      where: { status: 'pending', receiverId: userId },
      include: { requester: displayNameSelect },
    });

    return pending.map((f) => ({
      friendshipId: f.id,
      requesterId: f.requesterId,
      requesterName: f.requester.displayName,
    }));
  }

  async sendRequest(requesterId: string, receiverId: string) {
    if (requesterId === receiverId) {
      throw new BadRequestException('Cannot send a request to yourself');
    }

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, receiverId },
          { requesterId: receiverId, receiverId: requesterId },
        ],
      },
    });
    if (existing) throw new ConflictException('Friendship already exists');

    return this.prisma.friendship.create({
      data: { requesterId, receiverId },
    });
  }

  async requestByEmail(requesterId: string, email: string) {
    const target = await this.prisma.user.findUnique({ where: { email } });
    if (!target) throw new NotFoundException('No user found with this email');
    return this.sendRequest(requesterId, target.id);
  }

  async respond(id: string, status: FriendshipStatus) {
    const friendship = await this.prisma.friendship.findUnique({ where: { id } });
    if (!friendship) throw new NotFoundException('Friendship request not found');

    return this.prisma.friendship.update({ where: { id }, data: { status } });
  }
}
