import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { KBService } from './kb.service';
import { KBController } from './kb.controller';
import { PersonalKB } from './personal-kb.entity';
import { KnowledgeBase } from './knowledge-base.entity';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PersonalKB, KnowledgeBase]),
    CacheModule.register({ ttl: 300000 }),
    UsersModule,
    AuditModule,
  ],
  controllers: [KBController],
  providers: [KBService],
  exports: [KBService],
})
export class KBModule {}
