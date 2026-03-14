import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { PersonalKB } from './personal-kb.entity';
import { KnowledgeBase, KnowledgeBaseStatus } from './knowledge-base.entity';
import { User } from '../users/user.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class KBService {
  constructor(
    @InjectRepository(PersonalKB)
    private personalKbRepository: Repository<PersonalKB>,
    @InjectRepository(KnowledgeBase)
    private knowledgeBaseRepository: Repository<KnowledgeBase>,
    private auditService: AuditService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async saveToPersonalKb(data: {
    symptom: string;
    drug: string;
    mechanism?: string;
    precautions?: string;
    side_effects?: string;
  }, user: User): Promise<PersonalKB> {
    const existingEntry = await this.personalKbRepository.findOne({
      where: {
        user_id: user.id,
        symptom: data.symptom,
        drug: data.drug,
      },
    });

    if (existingEntry) {
      throw new UnauthorizedException('Entry already exists in your personal knowledge base');
    }

    const entry = this.personalKbRepository.create({
      user_id: user.id,
      ...data,
    });

    // Log the save action
    await this.auditService.logAction(user.id, 'personal_kb_saved', 'personal_kb', entry.id, {
      symptom: data.symptom,
      drug: data.drug,
    });

    return this.personalKbRepository.save(entry);
  }

  async requestKbAddition(data: {
    symptom: string;
    drug: string;
    mechanism?: string;
    precautions?: string;
    side_effects?: string;
  }, user: User): Promise<KnowledgeBase> {
    const entry = this.knowledgeBaseRepository.create({
      symptom: data.symptom,
      drug: data.drug,
      mechanism: data.mechanism,
      precautions: data.precautions,
      side_effects: data.side_effects,
      created_by: user,
      created_by_id: user.id,
      status: KnowledgeBaseStatus.PENDING,
    });

    // Log the request action
    await this.auditService.logAction(user.id, 'kb_addition_requested', 'knowledge_base', entry.id, {
      symptom: data.symptom,
      drug: data.drug,
    });

    return this.knowledgeBaseRepository.save(entry);
  }

  async getPersonalKb(userId: string): Promise<PersonalKB[]> {
    return this.personalKbRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async getSystemKb(status: KnowledgeBaseStatus = KnowledgeBaseStatus.APPROVED): Promise<KnowledgeBase[]> {
    const cacheKey = `system_kb_${status}`;
    const cached = await this.cacheManager.get<KnowledgeBase[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const entries = await this.knowledgeBaseRepository.find({
      where: { status },
      order: { created_at: 'DESC' },
      relations: ['created_by', 'approved_by'],
    });

    await this.cacheManager.set(cacheKey, entries, 300000);
    return entries;
  }

  async approveKbEntry(entryId: string, adminUser: User): Promise<KnowledgeBase> {
    const entry = await this.knowledgeBaseRepository.findOne({
      where: { id: entryId },
      relations: ['created_by'],
    });

    if (!entry) {
      throw new NotFoundException('KB entry not found');
    }

    if (entry.status !== KnowledgeBaseStatus.PENDING) {
      throw new UnauthorizedException('Entry is not pending approval');
    }

    entry.status = KnowledgeBaseStatus.APPROVED;
    entry.approved_by = adminUser;
    entry.approved_by_id = adminUser.id;

    const approvedEntry = await this.knowledgeBaseRepository.save(entry);

    await this.cacheManager.del('system_kb_pending');
    await this.cacheManager.del('system_kb_approved');

    // Log the approval
    await this.auditService.logAction(adminUser.id, 'kb_entry_approved', 'knowledge_base', entryId, {
      created_by_user: entry.created_by?.email,
      symptom: entry.symptom,
      drug: entry.drug,
    });

    return approvedEntry;
  }

  async rejectKbEntry(entryId: string, adminUser: User, reason?: string): Promise<KnowledgeBase> {
    const entry = await this.knowledgeBaseRepository.findOne({
      where: { id: entryId },
      relations: ['created_by'],
    });

    if (!entry) {
      throw new NotFoundException('KB entry not found');
    }

    if (entry.status !== KnowledgeBaseStatus.PENDING) {
      throw new UnauthorizedException('Entry is not pending approval');
    }

    entry.status = KnowledgeBaseStatus.REJECTED;
    entry.approved_by = adminUser;
    entry.approved_by_id = adminUser.id;

    const rejectedEntry = await this.knowledgeBaseRepository.save(entry);

    await this.cacheManager.del('system_kb_pending');

    // Log the rejection
    await this.auditService.logAction(adminUser.id, 'kb_entry_rejected', 'knowledge_base', entryId, {
      created_by_user: entry.created_by?.email,
      symptom: entry.symptom,
      drug: entry.drug,
      reason,
    });

    return rejectedEntry;
  }

  async getPendingEntries(): Promise<KnowledgeBase[]> {
    return this.knowledgeBaseRepository.find({
      where: { status: KnowledgeBaseStatus.PENDING },
      order: { created_at: 'ASC' },
      relations: ['created_by'],
    });
  }

  async deletePersonalKbEntry(entryId: string, user: User): Promise<{ deleted: boolean }> {
    const entry = await this.personalKbRepository.findOne({
      where: { id: entryId, user_id: user.id },
    });

    if (!entry) {
      throw new NotFoundException('Personal KB entry not found');
    }

    await this.personalKbRepository.remove(entry);

    await this.auditService.logAction(user.id, 'personal_kb_deleted', 'personal_kb', entryId, {
      symptom: entry.symptom,
      drug: entry.drug,
    });

    return { deleted: true };
  }
}
