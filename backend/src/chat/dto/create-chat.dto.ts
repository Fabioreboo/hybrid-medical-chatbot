import { IsString, IsEnum, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ChatMessageSource } from '../chat.entity';

export class CreateChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  response: string;

  @IsEnum(ChatMessageSource)
  source: ChatMessageSource;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  session_id?: string;
}