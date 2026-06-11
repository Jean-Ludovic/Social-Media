import { Injectable, NotFoundException } from '@nestjs/common';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  private posts: Post[] = [];

  async findAll(): Promise<Post[]> {
    return this.posts;
  }

  async findOne(id: string): Promise<Post> {
    const post = this.posts.find((p) => p.id === id);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async create(authorId: string, dto: CreatePostDto): Promise<Post> {
    const post: Post = {
      id: Date.now().toString(),
      authorId,
      content: dto.content,
      imageUrl: dto.imageUrl ?? null,
      type: dto.type ?? 'post',
      createdAt: new Date(),
    };
    this.posts.push(post);
    return post;
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
