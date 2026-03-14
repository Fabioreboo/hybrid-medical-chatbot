import { IsOptional, IsString } from 'class-validator';

export class ApproveKbDto {
  // No additional fields needed for approval
}

export class RejectKbDto {
  @IsOptional()
  @IsString()
  reason?: string;
}