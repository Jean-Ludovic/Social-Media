import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FriendshipsService } from '../friendships/friendships.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLiveDto } from './dto/create-live.dto';
import { LiveStatusFilter } from './dto/find-lives.dto';

const hostSelect = {
  host: { select: { displayName: true, avatarUrl: true } },
} as const;

type LiveWithHost = Prisma.LiveGetPayload<{ include: typeof hostSelect }>;

const ENDED_LIVES_LIMIT = 50;

function toLiveResponse({ host, ...live }: LiveWithHost) {
  return { ...live, hostName: host.displayName, hostAvatarUrl: host.avatarUrl };
}

@Injectable()
export class LivesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friendships: FriendshipsService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(status: LiveStatusFilter = 'active') {
    const where: Prisma.LiveWhereInput =
      status === 'active' ? { endedAt: null } : status === 'ended' ? { endedAt: { not: null } } : {};

    const lives = await this.prisma.live.findMany({
      where,
      include: hostSelect,
      orderBy: [{ endedAt: { sort: 'desc', nulls: 'first' } }, { createdAt: 'desc' }],
      take: status === 'active' ? undefined : ENDED_LIVES_LIMIT,
    });
    return lives.map(toLiveResponse);
  }

  async findOne(id: string) {
    const live = await this.prisma.live.findUnique({ where: { id }, include: hostSelect });
    if (!live) throw new NotFoundException('Live not found');
    return toLiveResponse(live);
  }

  async findByHost(hostId: string) {
    const lives = await this.prisma.live.findMany({
      where: { hostId },
      include: hostSelect,
      orderBy: { createdAt: 'desc' },
    });
    return lives.map(toLiveResponse);
  }

  async start(hostId: string, dto: CreateLiveDto) {
    const active = await this.prisma.live.findFirst({
      where: { hostId, endedAt: null },
      select: { id: true },
    });
    if (active) throw new ConflictException('You already have a live in progress');

    const live = await this.prisma.live.create({
      data: {
        hostId,
        title: dto.title,
        streamUrl: dto.streamUrl ?? null,
        startedAt: new Date(),
      },
      include: hostSelect,
    });

    const friendIds = await this.friendships.getFriendIds(hostId);
    await this.notifications.notifyMany(
      friendIds,
      'live',
      `${live.host.displayName} a démarré un live : ${live.title}`,
      live.id,
    );
    return toLiveResponse(live);
  }

  async end(id: string, hostId: string) {
    const live = await this.prisma.live.findUnique({ where: { id } });
    if (!live) throw new NotFoundException('Live not found');
    if (live.hostId !== hostId) throw new ForbiddenException('Not allowed');
    if (live.endedAt) throw new ConflictException('Live already ended');

    try {
      // The endedAt filter makes ending atomic if two requests race.
      const updated = await this.prisma.live.update({
        where: { id, endedAt: null },
        data: { endedAt: new Date() },
        include: hostSelect,
      });
      return toLiveResponse(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ConflictException('Live already ended');
      }
      throw error;
    }
  }
}
