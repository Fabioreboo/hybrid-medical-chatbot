import { Controller, Get, Post, Body, UseGuards, Request, Param, Delete, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { ChatMessage } from './chat.entity';
import { User } from '../users/user.entity';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async sendMessage(@Body() createChatDto: CreateChatDto, @Request() req): Promise<ChatMessage> {
    const user = req.user as User;
    return this.chatService.create(createChatDto, user);
  }

  @Get('history')
  @UseGuards(AuthGuard('jwt'))
  async getChatHistory(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    const user = req.user as User;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    return this.chatService.getUserChatHistory(user.id, pageNumber, limitNumber);
  }

  @Post(':id/save')
  @UseGuards(AuthGuard('jwt'))
  async saveToKb(@Param('id') id: string, @Request() req) {
    const user = req.user as User;
    return this.chatService.saveToPersonalKb(id, user);
  }

  @Get('saved')
  @UseGuards(AuthGuard('jwt'))
  async getSavedMessages(@Request() req) {
    const user = req.user as User;
    return this.chatService.getSavedMessages(user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async deleteMessage(@Param('id') id: string, @Request() req) {
    const user = req.user as User;
    return this.chatService.deleteMessage(id, user);
  }

  @Delete('history/all')
  @UseGuards(AuthGuard('jwt'))
  async clearHistory(@Request() req) {
    const user = req.user as User;
    return this.chatService.clearUserHistory(user);
  }
}