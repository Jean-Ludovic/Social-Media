export type PostType = 'post' | 'debate';

export class Post {
  id: string;
  authorId: string;
  content: string;
  imageUrl: string | null;
  type: PostType;
  createdAt: Date;
}
