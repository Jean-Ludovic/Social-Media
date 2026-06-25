import { IsIn, IsOptional, IsString } from 'class-validator';

export type DebateFilter = 'popular' | 'new' | 'unvoted' | 'voted' | 'mine';

const DEBATE_FILTERS: DebateFilter[] = ['popular', 'new', 'unvoted', 'voted', 'mine'];

export class FindDebatesDto {
  @IsOptional()
  @IsIn(DEBATE_FILTERS)
  filter?: DebateFilter;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  author?: string;
}
