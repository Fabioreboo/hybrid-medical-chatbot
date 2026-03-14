import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/user.service';
import { KBService } from '../kb/kb.service';
import { AuditService } from '../audit/audit.service';
import { User } from '../users/user.entity';
import { KnowledgeBase, KnowledgeBaseStatus } from '../kb/knowledge-base.entity';
import { AuditLog } from '../audit/audit.entity';
import { ChatMessage } from '../chat/chat.entity';

@Injectable()
export class AdminService {
  constructor(
    private usersService: UsersService,
    private kbService: KBService,
    private auditService: AuditService,
    @InjectRepository(ChatMessage)
    private chatRepository: Repository<ChatMessage>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(KnowledgeBase)
    private kbRepository: Repository<KnowledgeBase>,
  ) {}

  async ensureAdmin(user: User): Promise<void> {
    if (user.role !== 'admin') {
      throw new UnauthorizedException('Admin access required');
    }
  }

  async getAllUsers(): Promise<any[]> {
    return this.usersService.getAllUsers();
  }

  async makeAdmin(userId: string, adminUser: User): Promise<User> {
    await this.ensureAdmin(adminUser);
    const user = await this.usersService.makeAdmin(userId);
    await this.auditService.logAction(adminUser.id, 'user_made_admin', 'users', userId, {
      target_user_email: user.email,
    });
    return user;
  }

  async deactivateUser(userId: string, adminUser: User): Promise<User> {
    await this.ensureAdmin(adminUser);
    const user = await this.usersService.deactivateUser(userId);
    await this.auditService.logAction(adminUser.id, 'user_deactivated', 'users', userId, {
      target_user_email: user.email,
    });
    return user;
  }

  async activateUser(userId: string, adminUser: User): Promise<User> {
    await this.ensureAdmin(adminUser);
    const user = await this.usersService.activateUser(userId);
    await this.auditService.logAction(adminUser.id, 'user_activated', 'users', userId, {
      target_user_email: user.email,
    });
    return user;
  }

  async getPendingKbEntries(): Promise<KnowledgeBase[]> {
    return this.kbService.getPendingEntries();
  }

  async approveKbEntry(entryId: string, adminUser: User): Promise<KnowledgeBase> {
    await this.ensureAdmin(adminUser);
    return this.kbService.approveKbEntry(entryId, adminUser);
  }

  async rejectKbEntry(entryId: string, adminUser: User, reason?: string): Promise<KnowledgeBase> {
    await this.ensureAdmin(adminUser);
    return this.kbService.rejectKbEntry(entryId, adminUser, reason);
  }

  async getSystemKb(): Promise<KnowledgeBase[]> {
    return this.kbService.getSystemKb(KnowledgeBaseStatus.APPROVED);
  }

  async getAuditLogs(
    page: number = 1,
    limit: number = 50,
    userId?: string,
    action?: string,
  ): Promise<{ logs: AuditLog[]; total: number; page: number; totalPages: number }> {
    return this.auditService.getAuditLogs(userId, action, page, limit);
  }

  async getSystemStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalChats: number;
    totalKbEntries: number;
    pendingApprovals: number;
    chatsByDay: { date: string; count: number }[];
    topSymptoms: { symptom: string; count: number }[];
  }> {
    const [
      totalUsers,
      activeUsers,
      totalChats,
      totalKbEntries,
      pendingApprovals,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { is_active: true } }),
      this.chatRepository.count(),
      this.kbRepository.count({ where: { status: KnowledgeBaseStatus.APPROVED } }),
      this.kbRepository.count({ where: { status: KnowledgeBaseStatus.PENDING } }),
    ]);

    // Chat activity for the last 7 days
    const chatsByDay = await this.chatRepository
      .createQueryBuilder('msg')
      .select("DATE_TRUNC('day', msg.created_at)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where("msg.created_at >= NOW() - INTERVAL '7 days'")
      .groupBy("DATE_TRUNC('day', msg.created_at)")
      .orderBy('date', 'ASC')
      .getRawMany();

    // Top symptoms from approved KB
    const topSymptoms = await this.kbRepository
      .createQueryBuilder('kb')
      .select('kb.symptom', 'symptom')
      .addSelect('COUNT(*)', 'count')
      .where('kb.status = :status', { status: KnowledgeBaseStatus.APPROVED })
      .groupBy('kb.symptom')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalUsers,
      activeUsers,
      totalChats,
      totalKbEntries,
      pendingApprovals,
      chatsByDay: chatsByDay.map(d => ({
        date: new Date(d.date).toLocaleDateString(),
        count: parseInt(d.count, 10),
      })),
      topSymptoms: topSymptoms.map(s => ({
        symptom: s.symptom,
        count: parseInt(s.count, 10),
      })),
    };
  }
}