import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLiveDto } from './dto/create-live.dto';

const hostSelect = {
  host: { select: { displayName: true, avatarUrl: true } },
} as const;

@Injectable()
export class LivesService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive() {
    const lives = await this.prisma.live.findMany({
      where: { endedAt: null },
      include: hostSelect,
      orderBy: { createdAt: 'desc' },
    });
    return lives.map(({ host, ...live }) => ({
      ...live,
      hostName: host.displayName,
      hostAvatarUrl: host.avatarUrl,
    }));
  }

  async findOne(id: string) {
    const live = await this.prisma.live.findUnique({ where: { id }, include: hostSelect });
    if (!live) throw new NotFoundException('Live not found');
    const { host, ...rest } = live;
    return { ...rest, hostName: host.displayName, hostAvatarUrl: host.avatarUrl };
  }

  async findByHost(hostId: string) {
    const lives = await this.prisma.live.findMany({
      where: { hostId },
      include: hostSelect,
      orderBy: { createdAt: 'desc' },
    });
    return lives.map(({ host, ...live }) => ({
      ...live,
      hostName: host.displayName,
      hostAvatarUrl: host.avatarUrl,
    }));
  }

  async start(hostId: string, dto: CreateLiveDto) {
    const live = await this.prisma.live.create({
      data: {
        hostId,
        title: dto.title,
        streamUrl: dto.streamUrl ?? null,
        startedAt: new Date(),
      },
      include: hostSelect,
    });
    const { host, ...rest } = live;
    return { ...rest, hostName: host.displayName, hostAvatarUrl: host.avatarUrl };
  }

  async end(id: string, hostId: string) {
    const live = await this.prisma.live.findUnique({ where: { id } });
    if (!live) throw new NotFoundException('Live not found');
    if (live.hostId !== hostId) throw new ForbiddenException('Not allowed');

    const updated = await this.prisma.live.update({
      where: { id },
      data: { endedAt: new Date() },
      include: hostSelect,
    });
    const { host, ...rest } = updated;
    return { ...rest, hostName: host.displayName, hostAvatarUrl: host.avatarUrl };
  }
}
