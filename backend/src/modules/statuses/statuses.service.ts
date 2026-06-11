import { Injectable, NotFoundException } from '@nestjs/common';
import { Status } from './entities/status.entity';
import { CreateStatusDto } from './dto/create-status.dto';

const STATUS_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class StatusesService {
  private statuses: Status[] = [];

  async findActive(): Promise<Status[]> {
    const now = new Date();
    return this.statuses.filter((s) => s.expiresAt > now);
  }

  async create(userId: string, dto: CreateStatusDto): Promise<Status> {
    const status: Status = {
      id: Date.now().toString(),
      userId,
      content: dto.content,
      expiresAt: new Date(Date.now() + STATUS_TTL_MS),
      createdAt: new Date(),
    };
    this.statuses.push(status);
    return status;
  }

  async remove(id: string): Promise<void> {
    const idx = this.statuses.findIndex((s) => s.id === id);
    if (idx === -1) throw new NotFoundException('Status not found');
    this.statuses.splice(idx, 1);
  }
}
