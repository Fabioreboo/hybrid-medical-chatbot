import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage, ChatMessageSource } from './chat.entity';
import { User } from '../users/user.entity';
import { CreateChatDto } from './dto/create-chat.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatRepository: Repository<ChatMessage>,
    private auditService: AuditService,
  ) {}

  async create(createChatDto: CreateChatDto, user: User): Promise<ChatMessage> {
    const chatMessage = this.chatRepository.create({
      user_id: user.id,
      message: createChatDto.message,
      response: createChatDto.response,
      source: createChatDto.source,
      session_id: createChatDto.session_id,
    });

    // Log chat creation
    await this.auditService.logAction(user.id, 'chat_message_created', 'chat_messages', chatMessage.id, {
      message_length: createChatDto.message.length,
      response_length: createChatDto.response.length,
      source: createChatDto.source,
    });

    return this.chatRepository.save(chatMessage);
  }

  async getUserChatHistory(userId: string, page: number = 1, limit: number = 50): Promise<{
    messages: ChatMessage[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [messages, total] = await this.chatRepository.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip,
      take: limit,
      relations: ['user'],
    });

    return {
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async saveToPersonalKb(messageId: string, user: User): Promise<ChatMessage> {
    const message = await this.chatRepository.findOne({
      where: { id: messageId, user_id: user.id },
    });

    if (!message) {
      throw new NotFoundException('Chat message not found');
    }

    if (message.is_saved) {
      throw new UnauthorizedException('Message already saved');
    }

    message.is_saved = true;
    const savedMessage = await this.chatRepository.save(message);

    // Log the save action
    await this.auditService.logAction(user.id, 'chat_message_saved', 'chat_messages', messageId, {
      message_content: message.message.substring(0, 100),
    });

    return savedMessage;
  }

  async getSavedMessages(userId: string): Promise<ChatMessage[]> {
    return this.chatRepository.find({
      where: { user_id: userId, is_saved: true },
      order: { created_at: 'DESC' },
    });
  }

  async deleteMessage(messageId: string, user: User): Promise<{ deleted: boolean }> {
    const message = await this.chatRepository.findOne({
      where: { id: messageId, user_id: user.id },
    });

    if (!message) {
      throw new NotFoundException('Chat message not found');
    }

    await this.chatRepository.remove(message);

    await this.auditService.logAction(user.id, 'chat_message_deleted', 'chat_messages', messageId, {
      message_preview: message.message.substring(0, 100),
    });

    return { deleted: true };
  }

  async clearUserHistory(user: User): Promise<{ deleted: number }> {
    const messages = await this.chatRepository.find({ where: { user_id: user.id } });
    await this.chatRepository.remove(messages);

    await this.auditService.logAction(user.id, 'chat_history_cleared', 'chat_messages', undefined, {
      count: messages.length,
    });

    return { deleted: messages.length };
  }
}