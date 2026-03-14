import { Controller, Get, Post, Delete, Body, UseGuards, Request, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { KBService } from './kb.service';
import { User } from '../users/user.entity';
import { SaveToKbDto, RequestKbAdditionDto } from './dto/kb.dto';

@Controller('kb')
export class KBController {
  constructor(private readonly kbService: KBService) {}

  @Post('personal')
  @UseGuards(AuthGuard('jwt'))
  async saveToPersonalKb(@Body() saveDto: SaveToKbDto, @Request() req) {
    const user = req.user as User;
    return this.kbService.saveToPersonalKb(saveDto, user);
  }

  @Post('request-addition')
  @UseGuards(AuthGuard('jwt'))
  async requestKbAddition(@Body() requestDto: RequestKbAdditionDto, @Request() req) {
    const user = req.user as User;
    return this.kbService.requestKbAddition(requestDto, user);
  }

  @Get('personal')
  @UseGuards(AuthGuard('jwt'))
  async getPersonalKb(@Request() req) {
    const user = req.user as User;
    return this.kbService.getPersonalKb(user.id);
  }

  @Get('system')
  @UseGuards(AuthGuard('jwt'))
  async getSystemKb(@Request() req) {
    return this.kbService.getSystemKb();
  }

  @Delete('personal/:id')
  @UseGuards(AuthGuard('jwt'))
  async deletePersonalKbEntry(@Param('id') id: string, @Request() req) {
    const user = req.user as User;
    return this.kbService.deletePersonalKbEntry(id, user);
  }
}