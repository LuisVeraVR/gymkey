import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsString()
  planId: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  method: string; // 'CARD', 'CASH', 'SIMULATED'

  @IsOptional()
  @IsString()
  provider?: string;
}
