import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

export enum KnowledgeBaseStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('knowledge_base')
@Index('idx_kb_status', ['status'])
@Index('idx_kb_symptom_drug', ['symptom', 'drug'])
export class KnowledgeBase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  symptom: string;

  @Column()
  drug: string;

  @Column({ type: 'text', nullable: true })
  mechanism: string;

  @Column({ type: 'text', nullable: true })
  precautions: string;

  @Column({ type: 'text', nullable: true })
  side_effects: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by: User;

  @Column({ nullable: true })
  created_by_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approved_by: User;

  @Column({ nullable: true })
  approved_by_id: string;

  @Column({
    type: 'enum',
    enum: KnowledgeBaseStatus,
    default: KnowledgeBaseStatus.PENDING,
  })
  status: KnowledgeBaseStatus;

  @Column({ default: 1 })
  version: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}