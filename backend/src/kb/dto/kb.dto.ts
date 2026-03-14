import { IsString, IsOptional, MaxLength } from 'class-validator';

export class SaveToKbDto {
  @IsString()
  @MaxLength(500)
  symptom: string;

  @IsString()
  @MaxLength(500)
  drug: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mechanism?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  precautions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  side_effects?: string;
}

export class RequestKbAdditionDto {
  @IsString()
  @MaxLength(500)
  symptom: string;

  @IsString()
  @MaxLength(500)
  drug: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mechanism?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  precautions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  side_effects?: string;
}