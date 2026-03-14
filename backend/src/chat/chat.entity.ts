import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

export enum ChatMessageSource {
  DATABASE = 'database',
  LLM_FALLBACK = 'llm_fallback',
}

@Entity('chat_messages')
@Index('idx_chat_user_id', ['user_id'])
@Index('idx_chat_user_created', ['user_id', 'created_at'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text' })
  response: string;

  @Column({
    type: 'enum',
    enum: ChatMessageSource,
  })
  source: ChatMessageSource;

  @Column({ default: false })
  is_saved: boolean;

  @Column({ nullable: true })
  session_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}