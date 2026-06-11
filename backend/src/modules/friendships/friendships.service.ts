import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Friendship, FriendshipStatus } from './entities/friendship.entity';

@Injectable()
export class FriendshipsService {
  private friendships: Friendship[] = [];

  async getFriends(userId: string): Promise<Friendship[]> {
    return this.friendships.filter(
      (f) =>
        f.status === 'accepted' &&
        (f.requesterId === userId || f.receiverId === userId),
    );
  }

  async getPendingRequests(userId: string): Promise<Friendship[]> {
    return this.friendships.filter(
      (f) => f.status === 'pending' && f.receiverId === userId,
    );
  }

  async sendRequest(requesterId: string, receiverId: string): Promise<Friendship> {
    const exists = this.friendships.find(
      (f) =>
        (f.requesterId === requesterId && f.receiverId === receiverId) ||
        (f.requesterId === receiverId && f.receiverId === requesterId),
    );
    if (exists) throw new ConflictException('Friendship already exists');

    const friendship: Friendship = {
      id: Date.now().toString(),
      requesterId,
      receiverId,
      status: 'pending',
      createdAt: new Date(),
    };
    this.friendships.push(friendship);
    return friendship;
  }

  async respond(id: string, status: FriendshipStatus): Promise<Friendship> {
    const friendship = this.friendships.find((f) => f.id === id);
    if (!friendship) throw new NotFoundException('Friendship request not found');
    friendship.status = status;
    return friendship;
  }
}
