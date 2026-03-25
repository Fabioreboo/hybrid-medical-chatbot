import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatMessage } from './chat.entity';
import { ChatThread } from './chat-thread.entity';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage, ChatThread]), UsersModule, AuditModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
