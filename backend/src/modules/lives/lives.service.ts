import { Injectable, NotFoundException } from '@nestjs/common';
import { Live } from './entities/live.entity';
import { CreateLiveDto } from './dto/create-live.dto';

@Injectable()
export class LivesService {
  private lives: Live[] = [];

  async findActive(): Promise<Live[]> {
    return this.lives.filter((l) => !l.endedAt);
  }

  async findOne(id: string): Promise<Live> {
    const live = this.lives.find((l) => l.id === id);
    if (!live) throw new NotFoundException('Live not found');
    return live;
  }

  async start(hostId: string, dto: CreateLiveDto): Promise<Live> {
    const live: Live = {
      id: Date.now().toString(),
      hostId,
      title: dto.title,
      streamUrl: null,
      startedAt: new Date(),
      endedAt: null,
    };
    this.lives.push(live);
    return live;
  }

  async end(id: string): Promise<Live> {
    const live = await this.findOne(id);
    live.endedAt = new Date();
    return live;
  }
}
