import { Injectable, NotFoundException } from '@nestjs/common';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { UsersService } from '../users/users.service';

export interface PostWithAuthor extends Post {
  authorName: string;
}

@Injectable()
export class PostsService {
  constructor(private readonly usersService: UsersService) {}

  private posts: Post[] = [];

  async findAll(): Promise<PostWithAuthor[]> {
    const results: PostWithAuthor[] = [];
    for (const post of [...this.posts].reverse()) {
      try {
        const author = await this.usersService.findById(post.authorId);
        results.push({ ...post, authorName: author.displayName });
      } catch {
        results.push({ ...post, authorName: 'Utilisateur inconnu' });
      }
    }
    return results;
  }

  async findOne(id: string): Promise<Post> {
    const post = this.posts.find((p) => p.id === id);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async create(authorId: string, dto: CreatePostDto): Promise<PostWithAuthor> {
    const post: Post = {
      id: Date.now().toString(),
      authorId,
      content: dto.content,
      imageUrl: dto.imageUrl ?? null,
      type: dto.type ?? 'post',
      createdAt: new Date(),
    };
    this.posts.push(post);
    try {
      const author = await this.usersService.findById(authorId);
      return { ...post, authorName: author.displayName };
    } catch {
      return { ...post, authorName: 'Utilisateur inconnu' };
    }
  }

  async update(id: string, dto: UpdatePostDto): Promise<Post> {
    const post = await this.findOne(id);
    Object.assign(post, dto);
    return post;
  }

  async remove(id: string): Promise<void> {
    const idx = this.posts.findIndex((p) => p.id === id);
    if (idx === -1) throw new NotFoundException('Post not found');
    this.posts.splice(idx, 1);
  }
}
