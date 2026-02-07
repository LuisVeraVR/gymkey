import { IsOptional, IsString, IsObject } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  name?: string; // Tenant name

  @IsOptional()
  @IsObject()
  config?: any; // The JSON config
}
