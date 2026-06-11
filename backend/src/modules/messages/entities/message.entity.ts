export class Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  readAt: Date | null;
  createdAt: Date;
}
