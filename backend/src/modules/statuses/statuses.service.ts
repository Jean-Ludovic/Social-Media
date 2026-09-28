import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FriendshipsService } from '../friendships/friendships.service';
import { CreateStatusDto } from './dto/create-status.dto';

const STATUS_TTL_MS = 24 * 60 * 60 * 1000;

const authorSelect = {
  user: { select: { displayName: true, avatarUrl: true } },
} as const;

type StatusWithAuthor = Prisma.StatusGetPayload<{ include: typeof authorSelect }>;

function toStatusResponse({ user, ...status }: StatusWithAuthor) {
  return { ...status, authorName: user.displayName, authorAvatarUrl: user.avatarUrl };
}

/** Statuses are visible to their author and the author's accepted friends, until they expire. */
@Injectable()
export class StatusesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friendships: FriendshipsService,
  ) {}

  async findActive(viewerId: string) {
    const friendIds = await this.friendships.getFriendIds(viewerId);
    const statuses = await this.prisma.status.findMany({
      where: { userId: { in: [viewerId, ...friendIds] }, expiresAt: { gt: new Date() } },
      include: authorSelect,
      orderBy: { createdAt: 'desc' },
    });
    return statuses.map(toStatusResponse);
  }

  async findActiveByUser(viewerId: string, userId: string) {
    if (userId !== viewerId && !(await this.friendships.areFriends(viewerId, userId))) {
      throw new ForbiddenException('Statuses are only visible to friends');
    }
    const statuses = await this.prisma.status.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      include: authorSelect,
      orderBy: { createdAt: 'desc' },
    });
    return statuses.map(toStatusResponse);
  }

  async create(userId: string, dto: CreateStatusDto) {
    const status = await this.prisma.status.create({
      data: {
        userId,
        content: dto.content,
        expiresAt: new Date(Date.now() + STATUS_TTL_MS),
      },
      include: authorSelect,
    });
    return toStatusResponse(status);
  }

  async remove(id: string, userId: string): Promise<void> {
    const status = await this.prisma.status.findUnique({ where: { id } });
    if (!status) throw new NotFoundException('Status not found');
    if (status.userId !== userId) throw new ForbiddenException('Not allowed');

    await this.prisma.status.delete({ where: { id } });
  }
}
