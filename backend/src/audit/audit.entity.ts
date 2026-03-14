import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  user_id: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  resource_type: string;

  @Column({ nullable: true })
  resource_id: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ type: 'inet', nullable: true })
  ip_address: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}