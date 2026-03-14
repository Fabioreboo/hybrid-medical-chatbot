import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  async logAction(
    userId: string,
    action: string,
    resourceType?: string,
    resourceId?: string,
    metadata?: any,
    ipAddress?: string,
  ): Promise<AuditLog> {
    const auditLog = this.auditRepository.create({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata,
      ip_address: ipAddress,
    });

    return this.auditRepository.save(auditLog);
  }

  async getAuditLogs(
    userId?: string,
    action?: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.user_id = userId;
    if (action) where.action = action;

    const [logs, total] = await this.auditRepository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip,
      take: limit,
      relations: ['user'],
    });

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}