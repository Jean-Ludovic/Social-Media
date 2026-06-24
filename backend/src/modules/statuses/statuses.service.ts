import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStatusDto } from './dto/create-status.dto';

const STATUS_TTL_MS = 24 * 60 * 60 * 1000;

const authorSelect = {
  user: { select: { displayName: true, avatarUrl: true } },
} as const;

@Injectable()
export class StatusesService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive() {
    const statuses = await this.prisma.status.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: authorSelect,
      orderBy: { createdAt: 'desc' },
    });
    return statuses.map(({ user, ...status }) => ({
      ...status,
      authorName: user.displayName,
      authorAvatarUrl: user.avatarUrl,
    }));
  }

  async findActiveByUser(userId: string) {
    const statuses = await this.prisma.status.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      include: authorSelect,
      orderBy: { createdAt: 'desc' },
    });
    return statuses.map(({ user, ...status }) => ({
      ...status,
      authorName: user.displayName,
      authorAvatarUrl: user.avatarUrl,
    }));
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
    const { user, ...rest } = status;
    return { ...rest, authorName: user.displayName, authorAvatarUrl: user.avatarUrl };
  }

  async remove(id: string, userId: string): Promise<void> {
    const status = await this.prisma.status.findUnique({ where: { id } });
    if (!status) throw new NotFoundException('Status not found');
    if (status.userId !== userId) throw new ForbiddenException('Not allowed');

    await this.prisma.status.delete({ where: { id } });
  }
}
