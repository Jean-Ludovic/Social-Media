import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDebateDto } from './dto/create-debate.dto';
import { FindDebatesDto } from './dto/find-debates.dto';

// Shared include — author display name + all sides
const debateInclude = {
  author: { select: { displayName: true } },
  debateSides: { orderBy: { votesCount: 'desc' as const } },
} as const;

type DebatePost = {
  id: string;
  authorId: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
  author: { displayName: string };
  debateSides: { id: string; postId: string; label: string; votesCount: number }[];
};

// Maps a Prisma Post row (with includes) to the response shape expected by the frontend
function toDebateResponse(post: DebatePost, myVoteSideId: string | null) {
  const { content, author, debateSides, ...rest } = post;
  const totalVotes = debateSides.reduce((sum, s) => sum + s.votesCount, 0);
  return {
    ...rest,
    question: content,
    sides: debateSides,
    authorName: author.displayName,
    totalVotes,
    hasVoted: myVoteSideId !== null,
    myVoteSideId,
  };
}

@Injectable()
export class DebatesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getAcceptedFriendIds(userId: string): Promise<string[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      select: { requesterId: true, receiverId: true },
    });
    return friendships.map((f) => (f.requesterId === userId ? f.receiverId : f.requesterId));
  }

  private async isVisibleAuthor(authorId: string, userId: string): Promise<boolean> {
    if (authorId === userId) return true;
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: userId, receiverId: authorId },
          { requesterId: authorId, receiverId: userId },
        ],
      },
    });
    return !!friendship;
  }

  async findAll(userId: string, query: FindDebatesDto) {
    const friendIds = await this.getAcceptedFriendIds(userId);
    const visibleAuthorIds = [userId, ...friendIds];

    const where: Prisma.PostWhereInput = {
      type: 'debate',
      authorId: { in: visibleAuthorIds },
      ...(query.q ? { content: { contains: query.q, mode: 'insensitive' } } : {}),
      ...(query.author
        ? { author: { displayName: { contains: query.author, mode: 'insensitive' } } }
        : {}),
      ...(query.filter === 'mine' ? { authorId: userId } : {}),
    };

    const posts = await this.prisma.post.findMany({
      where,
      include: debateInclude,
      orderBy: { createdAt: 'desc' },
    });

    const votes = await this.prisma.debateVote.findMany({
      where: { userId, postId: { in: posts.map((p) => p.id) } },
    });
    const sideIdByPostId = new Map(votes.map((v) => [v.postId, v.sideId]));

    let debates = posts.map((post) => toDebateResponse(post, sideIdByPostId.get(post.id) ?? null));

    if (query.filter === 'popular') {
      debates = debates.sort((a, b) => b.totalVotes - a.totalVotes);
    } else if (query.filter === 'unvoted') {
      debates = debates.filter((d) => !d.hasVoted);
    } else if (query.filter === 'voted') {
      debates = debates.filter((d) => d.hasVoted);
    }

    return debates;
  }

  async findOne(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: debateInclude,
    });
    if (!post || post.type !== 'debate') throw new NotFoundException('Debate not found');

    const visible = await this.isVisibleAuthor(post.authorId, userId);
    if (!visible) throw new NotFoundException('Debate not found');

    const vote = await this.prisma.debateVote.findUnique({
      where: { postId_userId: { postId: id, userId } },
    });

    return toDebateResponse(post, vote?.sideId ?? null);
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
    return toDebateResponse(post, null);
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
    return this.findOne(debateId, userId);
  }
}
