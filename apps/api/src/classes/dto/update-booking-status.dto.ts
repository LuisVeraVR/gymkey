import { IsIn } from 'class-validator';

export class UpdateBookingStatusDto {
  @IsIn(['ATTENDED', 'NO_SHOW'])
  status: 'ATTENDED' | 'NO_SHOW';
}
