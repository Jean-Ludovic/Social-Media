import { Injectable, NotFoundException } from '@nestjs/common';
import { Debate } from './entities/debate.entity';
import { CreateDebateDto } from './dto/create-debate.dto';

@Injectable()
export class DebatesService {
  private debates: Debate[] = [];

  async findAll(): Promise<Debate[]> {
    return this.debates;
  }

  async findOne(id: string): Promise<Debate> {
    const debate = this.debates.find((d) => d.id === id);
    if (!debate) throw new NotFoundException('Debate not found');
    return debate;
  }

  async create(authorId: string, dto: CreateDebateDto): Promise<Debate> {
    const debate: Debate = {
      id: Date.now().toString(),
      authorId,
      question: dto.question,
      sides: dto.sides.map((label, i) => ({
        id: `${Date.now()}-${i}`,
        label,
        votesCount: 0,
      })),
      createdAt: new Date(),
    };
    this.debates.push(debate);
    return debate;
  }

  async vote(debateId: string, sideId: string, _userId: string): Promise<Debate> {
    const debate = await this.findOne(debateId);
    const side = debate.sides.find((s) => s.id === sideId);
    if (!side) throw new NotFoundException('Side not found');
    side.votesCount++;
    return debate;
  }
}
