import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FriendshipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

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

export type RelationshipStatus = 'none' | 'accepted' | 'pending_sent' | 'pending_received' | 'rejected';

export interface UserSearchResult {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  relationshipStatus: RelationshipStatus;
}

const displayNameSelect = { select: { displayName: true } } as const;

@Injectable()
export class FriendshipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Ids of every user with an accepted friendship with userId, whichever side sent the request. */
  async getFriendIds(userId: string): Promise<string[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      select: { requesterId: true, receiverId: true },
    });
    return friendships.map((f) => (f.requesterId === userId ? f.receiverId : f.requesterId));
  }

  /** True only if an accepted friendship exists between the two users, whichever of them sent the request. */
  async areFriends(userIdA: string, userIdB: string): Promise<boolean> {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: userIdA, receiverId: userIdB },
          { requesterId: userIdB, receiverId: userIdA },
        ],
      },
      select: { id: true },
    });
    return friendship !== null;
  }

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

    let friendship;
    try {
      friendship = await this.prisma.friendship.create({
        data: { requesterId, receiverId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }

    const requester = await this.prisma.user.findUnique({ where: { id: requesterId }, select: { displayName: true } });
    await this.notifications.notify(
      receiverId,
      'friend_request',
      `${requester?.displayName ?? "Quelqu'un"} vous a envoyé une demande d'ami.`,
      friendship.id,
    );
    return friendship;
  }

  async search(currentUserId: string, q: string): Promise<UserSearchResult[]> {
    const query = q.trim();
    if (query.length < 2) return [];

    const users = await this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [
          { displayName: { contains: query, mode: 'insensitive' } },
          // Exact match only: a partial match would let anyone enumerate every address.
          { email: { equals: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, displayName: true, avatarUrl: true },
      take: 20,
      orderBy: { displayName: 'asc' },
    });
    if (users.length === 0) return [];

    const userIds = users.map((u) => u.id);
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: currentUserId, receiverId: { in: userIds } },
          { receiverId: currentUserId, requesterId: { in: userIds } },
        ],
      },
    });

    const statusByUserId = new Map<string, RelationshipStatus>();
    for (const f of friendships) {
      const otherId = f.requesterId === currentUserId ? f.receiverId : f.requesterId;
      if (f.status === 'accepted') {
        statusByUserId.set(otherId, 'accepted');
      } else if (f.status === 'rejected') {
        statusByUserId.set(otherId, 'rejected');
      } else {
        statusByUserId.set(otherId, f.requesterId === currentUserId ? 'pending_sent' : 'pending_received');
      }
    }

    return users.map((u) => ({
      ...u,
      relationshipStatus: statusByUserId.get(u.id) ?? 'none',
    }));
  }

  async requestByEmail(requesterId: string, email: string) {
    const target = await this.prisma.user.findUnique({ where: { email } });
    if (!target) throw new NotFoundException('No user found with this email');
    return this.sendRequest(requesterId, target.id);
  }

  async respond(id: string, currentUserId: string, status: FriendshipStatus) {
    const friendship = await this.prisma.friendship.findUnique({ where: { id } });
    if (!friendship) throw new NotFoundException('Friendship request not found');
    if (friendship.receiverId !== currentUserId) {
      throw new ForbiddenException('Not allowed');
    }
    if (friendship.status !== 'pending') {
      throw new ConflictException(`Friendship request already ${friendship.status}`);
    }

    try {
      // The status filter makes the transition atomic if two responses race.
      return await this.prisma.friendship.update({
        where: { id, status: 'pending' },
        data: { status },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ConflictException('Friendship request already answered');
      }
      throw error;
    }
  }
}
