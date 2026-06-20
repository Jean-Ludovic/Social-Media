import { Injectable, NotFoundException } from '@nestjs/common';
import { Debate } from './entities/debate.entity';
import { CreateDebateDto } from './dto/create-debate.dto';
import { UsersService } from '../users/users.service';

export interface DebateWithAuthor extends Debate {
  authorName: string;
}

@Injectable()
export class DebatesService {
  constructor(private readonly usersService: UsersService) {}

  private debates: Debate[] = [];

  private async enrich(debate: Debate): Promise<DebateWithAuthor> {
    try {
      const author = await this.usersService.findById(debate.authorId);
      return { ...debate, authorName: author.displayName };
    } catch {
      return { ...debate, authorName: 'Utilisateur inconnu' };
    }
  }

  async findAll(): Promise<DebateWithAuthor[]> {
    const enriched = await Promise.all([...this.debates].reverse().map(d => this.enrich(d)));
    return enriched;
  }

  async findOne(id: string): Promise<DebateWithAuthor> {
    const debate = this.debates.find((d) => d.id === id);
    if (!debate) throw new NotFoundException('Debate not found');
    return this.enrich(debate);
  }

  async create(authorId: string, dto: CreateDebateDto): Promise<DebateWithAuthor> {
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
    return this.enrich(debate);
  }

  async vote(debateId: string, sideId: string, _userId: string): Promise<DebateWithAuthor> {
    const debate = this.debates.find((d) => d.id === debateId);
    if (!debate) throw new NotFoundException('Debate not found');
    const side = debate.sides.find((s) => s.id === sideId);
    if (!side) throw new NotFoundException('Side not found');
    side.votesCount++;
    return this.enrich(debate);
  }
}
