import { IsISO8601 } from 'class-validator';

export class BookClassDto {
  @IsISO8601()
  date: string;
}
