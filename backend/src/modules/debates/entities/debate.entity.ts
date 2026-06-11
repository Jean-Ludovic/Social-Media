export class DebateSide {
  id: string;
  label: string;
  votesCount: number;
}

export class Debate {
  id: string;
  authorId: string;
  question: string;
  sides: DebateSide[];
  createdAt: Date;
}
