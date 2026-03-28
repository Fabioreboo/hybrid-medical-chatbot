import { Controller, Get, Post, Param, Body, UseGuards, Query, Request, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { User } from '../users/user.entity';
import { ApproveKbDto, RejectKbDto } from './dto/admin-actions.dto';
import { ConfigService } from '@nestjs/config';

@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {}

  @Post('auth')
  @UseGuards(AuthGuard('jwt'))
  async verifyAdminPassword(@Body('password') password: any, @Request() req) {
    const user = req.user as User;
    await this.adminService.ensureAdmin(user);
    
    const envPassword = this.configService.get<string>('ADMIN_PASSWORD') || process.env.ADMIN_PASSWORD;
    if (!envPassword) {
      this.logger.error('ADMIN_PASSWORD environment variable is not set');
      return { success: false, message: 'Server configuration error' };
    }
    
    const correctPassword = String(envPassword).trim();
    const inputPassword = String(password).trim();
    
    if (inputPassword === correctPassword) {
      return { success: true };
    }
    return { success: false, message: 'Invalid admin password' };
  }

  @Post('verify-pin')
  @UseGuards(AuthGuard('jwt'))
  async verifyPin(@Body('pin') pin: any, @Request() req) {
    const user = req.user as User;
    await this.adminService.ensureAdmin(user);
    
    const envPin = this.configService.get<string>('ADMIN_PIN') || process.env.ADMIN_PIN;
    if (!envPin) {
      this.logger.error('ADMIN_PIN environment variable is not set');
      return { success: false, message: 'Server configuration error' };
    }
    
    const correctPin = String(envPin).trim();
    const inputPin = String(pin).trim();
    
    this.logger.log(`========== PIN CHECK ==========`);
    this.logger.log(`Received PIN: [${inputPin}] (type: ${typeof pin})`);
    this.logger.log(`Correct PIN: [${correctPin}]`);
    this.logger.log(`Match: ${inputPin === correctPin}`);
    this.logger.log(`================================`);
    
    if (inputPin === correctPin) {
      return { success: true };
    }
    return { success: false, message: 'Invalid PIN' };
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