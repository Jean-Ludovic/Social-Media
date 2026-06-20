import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Friendship, FriendshipStatus } from './entities/friendship.entity';
import { UsersService } from '../users/users.service';

export interface FriendEntry {
  friendshipId: string;
  friendId: string;
  friendName: string;
}

export interface PendingEntry {
  friendshipId: string;
  requesterId: string;
  requesterName: string;
}

@Injectable()
export class FriendshipsService {
  constructor(private readonly usersService: UsersService) {}

  private friendships: Friendship[] = [];

  async getFriends(userId: string): Promise<Friendship[]> {
    return this.friendships.filter(
      (f) => f.status === 'accepted' && (f.requesterId === userId || f.receiverId === userId),
    );
  }

  async getPendingRequests(userId: string): Promise<Friendship[]> {
    return this.friendships.filter(
      (f) => f.status === 'pending' && f.receiverId === userId,
    );
  }

  async getFriendsEnriched(userId: string): Promise<FriendEntry[]> {
    const accepted = await this.getFriends(userId);
    const entries: FriendEntry[] = [];
    for (const f of accepted) {
      const friendId = f.requesterId === userId ? f.receiverId : f.requesterId;
      try {
        const user = await this.usersService.findById(friendId);
        entries.push({ friendshipId: f.id, friendId, friendName: user.displayName });
      } catch {
        entries.push({ friendshipId: f.id, friendId, friendName: 'Utilisateur inconnu' });
      }
    }
    return entries;
  }

  async getPendingEnriched(userId: string): Promise<PendingEntry[]> {
    const pending = await this.getPendingRequests(userId);
    const entries: PendingEntry[] = [];
    for (const f of pending) {
      try {
        const user = await this.usersService.findById(f.requesterId);
        entries.push({ friendshipId: f.id, requesterId: f.requesterId, requesterName: user.displayName });
      } catch {
        entries.push({ friendshipId: f.id, requesterId: f.requesterId, requesterName: 'Utilisateur inconnu' });
      }
    }
    return entries;
  }

  async sendRequest(requesterId: string, receiverId: string): Promise<Friendship> {
    if (requesterId === receiverId) {
      throw new BadRequestException('Cannot send a request to yourself');
    }
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

  async requestByEmail(requesterId: string, email: string): Promise<Friendship> {
    const target = await this.usersService.findByEmail(email);
    if (!target) throw new NotFoundException('No user found with this email');
    return this.sendRequest(requesterId, target.id);
  }

  async respond(id: string, status: FriendshipStatus): Promise<Friendship> {
    const friendship = this.friendships.find((f) => f.id === id);
    if (!friendship) throw new NotFoundException('Friendship request not found');
    friendship.status = status;
    return friendship;
  }
}
