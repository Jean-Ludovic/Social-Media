import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

const authorSelect = { author: { select: { displayName: true } } } as const;

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const posts = await this.prisma.post.findMany({
      include: authorSelect,
      orderBy: { createdAt: 'desc' },
    });
    return posts.map(({ author, ...post }) => ({ ...post, authorName: author.displayName }));
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id }, include: authorSelect });
    if (!post) throw new NotFoundException('Post not found');
    const { author, ...rest } = post;
    return { ...rest, authorName: author.displayName };
  }

  async create(authorId: string, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        authorId,
        content: dto.content,
        imageUrl: dto.imageUrl ?? null,
        type: dto.type ?? 'post',
      },
      include: authorSelect,
    });
    const { author, ...rest } = post;
    return { ...rest, authorName: author.displayName };
  }

  async update(id: string, userId: string, dto: UpdatePostDto) {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Post not found');
    if (existing.authorId !== userId) throw new ForbiddenException('Not allowed');

    const post = await this.prisma.post.update({
      where: { id },
      data: dto,
      include: authorSelect,
    });
    const { author, ...rest } = post;
    return { ...rest, authorName: author.displayName };
  }

  async remove(id: string, userId: string): Promise<void> {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Post not found');
    if (existing.authorId !== userId) throw new ForbiddenException('Not allowed');

    await this.prisma.post.delete({ where: { id } });
  }
}
