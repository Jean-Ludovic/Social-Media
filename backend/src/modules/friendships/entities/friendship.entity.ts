export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

export class Friendship {
  id: string;
  requesterId: string;
  receiverId: string;
  status: FriendshipStatus;
  createdAt: Date;
}
