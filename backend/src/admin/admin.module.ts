import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { KBModule } from '../kb/kb.module';
import { AuditModule } from '../audit/audit.module';
import { KnowledgeBase } from '../kb/knowledge-base.entity';
import { User } from '../users/user.entity';
import { AuditLog } from '../audit/audit.entity';
import { ChatMessage } from '../chat/chat.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([KnowledgeBase, User, AuditLog, ChatMessage]),
    UsersModule,
    KBModule,
    AuditModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}