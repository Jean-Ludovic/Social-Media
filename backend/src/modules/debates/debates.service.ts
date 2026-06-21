import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDebateDto } from './dto/create-debate.dto';

// Shared include — author display name + all sides
const debateInclude = {
  author: { select: { displayName: true } },
  debateSides: { orderBy: { votesCount: 'desc' as const } },
} as const;

// Maps a Prisma Post row (with includes) to the response shape expected by the frontend
function toDebateResponse(post: {
  id: string;
  authorId: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
  author: { displayName: string };
  debateSides: { id: string; postId: string; label: string; votesCount: number }[];
}) {
  const { content, author, debateSides, ...rest } = post;
  return {
    ...rest,
    question: content,
    sides: debateSides,
    authorName: author.displayName,
  };
}

@Injectable()
export class DebatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const posts = await this.prisma.post.findMany({
      where: { type: 'debate' },
      include: debateInclude,
      orderBy: { createdAt: 'desc' },
    });
    return posts.map(toDebateResponse);
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: debateInclude,
    });
    if (!post || post.type !== 'debate') throw new NotFoundException('Debate not found');
    return toDebateResponse(post);
  }

  async create(authorId: string, dto: CreateDebateDto) {
    const post = await this.prisma.post.create({
      data: {
        authorId,
        content: dto.question,
        type: 'debate',
        imageUrl: null,
        debateSides: {
          create: dto.sides.map((label) => ({ label })),
        },
      },
      include: debateInclude,
    });
    return toDebateResponse(post);
  }

  async vote(debateId: string, sideId: string, userId: string) {
    // Verify the debate exists and the targeted side belongs to it
    const debate = await this.prisma.post.findUnique({
      where: { id: debateId },
      include: { debateSides: { where: { id: sideId } } },
    });
    if (!debate || debate.type !== 'debate') throw new NotFoundException('Debate not found');
    if (debate.debateSides.length === 0) throw new NotFoundException('Side not found');

    // Atomic: create vote record + increment denormalized counter
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.debateVote.create({
          data: { postId: debateId, sideId, userId },
        });
        await tx.debateSide.update({
          where: { id: sideId },
          data: { votesCount: { increment: 1 } },
        });
      });
    } catch (error) {
      // Unique constraint [postId, userId] fired → user already voted
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Already voted in this debate');
      }
      throw error;
    }

    // Return the updated debate with fresh vote counts
    return this.findOne(debateId);
  }
}
