export type NotificationType =
  | 'friend_request'
  | 'message'
  | 'like'
  | 'comment'
  | 'debate'
  | 'live';

export class Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  relatedId: string | null;
  read: boolean;
  createdAt: Date;
}
