import { IsIn, IsOptional } from 'class-validator';

export type LiveStatusFilter = 'active' | 'ended' | 'all';

const LIVE_STATUS_FILTERS: LiveStatusFilter[] = ['active', 'ended', 'all'];

export class FindLivesDto {
  @IsOptional()
  @IsIn(LIVE_STATUS_FILTERS)
  status?: LiveStatusFilter;
}
