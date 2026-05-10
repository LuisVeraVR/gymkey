import { IsNotEmpty, IsString, IsObject, IsOptional } from 'class-validator';

export class CreateRoutineDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsObject()
  content: any; // JSON structure for exercises

  @IsOptional()
  @IsString()
  userId?: string;
}
