import { Controller, Get, UseGuards, Request, Post, Res, Redirect } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { User } from '../users/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // Initiates Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @Redirect()
  async googleAuthCallback(@Request() req) {
    const { user }: { user: User } = req;
    const loginResult = await this.authService.login(user);

    // Redirect to frontend with JWT token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return {
      url: `${frontendUrl}/auth/callback?token=${loginResult.access_token}&user=${JSON.stringify(loginResult.user)}`,
    };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Request() req) {
    return req.user;
  }
}