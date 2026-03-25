import { Controller, Get, Post, Param, Body, UseGuards, Query, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { User } from '../users/user.entity';
import { ApproveKbDto, RejectKbDto } from './dto/admin-actions.dto';
import { ConfigService } from '@nestjs/config';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {}

  @Post('auth')
  @UseGuards(AuthGuard('jwt'))
  async verifyAdminPassword(@Body('password') password: string, @Request() req) {
    const user = req.user as User;
    await this.adminService.ensureAdmin(user);
    
    const correctPassword = this.configService.get<string>('ADMIN_PASSWORD');
    if (password === correctPassword) {
      return { success: true };
    }
    return { success: false, message: 'Invalid admin password' };
  }

  @Get('users')
  @UseGuards(AuthGuard('jwt'))
  async getAllUsers(@Request() req) {
    const user = req.user as User;
    await this.adminService.ensureAdmin(user);
    return this.adminService.getAllUsers();
  }

  @Post('users/:userId/admin')
  @UseGuards(AuthGuard('jwt'))
  async makeUserAdmin(@Param('userId') userId: string, @Request() req) {
    const user = req.user as User;
    return this.adminService.makeAdmin(userId, user);
  }

  @Post('users/:userId/deactivate')
  @UseGuards(AuthGuard('jwt'))
  async deactivateUser(@Param('userId') userId: string, @Request() req) {
    const user = req.user as User;
    return this.adminService.deactivateUser(userId, user);
  }

  @Post('users/:userId/activate')
  @UseGuards(AuthGuard('jwt'))
  async activateUser(@Param('userId') userId: string, @Request() req) {
    const user = req.user as User;
    return this.adminService.activateUser(userId, user);
  }

  @Get('kb/pending')
  @UseGuards(AuthGuard('jwt'))
  async getPendingKbEntries(@Request() req) {
    const user = req.user as User;
    await this.adminService.ensureAdmin(user);
    return this.adminService.getPendingKbEntries();
  }

  @Post('kb/:entryId/approve')
  @UseGuards(AuthGuard('jwt'))
  async approveKbEntry(
    @Param('entryId') entryId: string,
    @Body() approveDto: ApproveKbDto,
    @Request() req,
  ) {
    const user = req.user as User;
    return this.adminService.approveKbEntry(entryId, user);
  }

  @Post('kb/:entryId/reject')
  @UseGuards(AuthGuard('jwt'))
  async rejectKbEntry(
    @Param('entryId') entryId: string,
    @Body() rejectDto: RejectKbDto,
    @Request() req,
  ) {
    const user = req.user as User;
    return this.adminService.rejectKbEntry(entryId, user, rejectDto.reason);
  }

  @Get('kb/system')
  @UseGuards(AuthGuard('jwt'))
  async getSystemKb(@Request() req) {
    const user = req.user as User;
    await this.adminService.ensureAdmin(user);
    return this.adminService.getSystemKb();
  }

  @Get('audit/logs')
  @UseGuards(AuthGuard('jwt'))
  async getAuditLogs(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('userId') userId?: string,
    @Query('action') action?: string,
  ) {
    const user = req.user as User;
    await this.adminService.ensureAdmin(user);
    return this.adminService.getAuditLogs(
      parseInt(page, 10),
      parseInt(limit, 10),
      userId,
      action,
    );
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'))
  async getSystemStats(@Request() req) {
    const user = req.user as User;
    await this.adminService.ensureAdmin(user);
    return this.adminService.getSystemStats();
  }
}