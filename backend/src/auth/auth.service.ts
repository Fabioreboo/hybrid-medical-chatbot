import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/user.service';
import { User } from '../users/user.entity';
import { GoogleProfile } from './interfaces/google-profile.interface';

type LoginResponseUser = Pick<
  User,
  'id' | 'email' | 'name' | 'role' | 'is_active' | 'avatar_url' | 'created_at' | 'last_login'
>;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateGoogleUser(profile: GoogleProfile): Promise<User> {
    try {
      // Check if user exists
      let user = await this.usersService.findByGoogleId(profile.id);

      // If user doesn't exist, create new user
      if (!user) {
        user = await this.usersService.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          avatarUrl: profile.photos?.[0]?.value,
        });
      } else if (!user.is_active) {
        throw new UnauthorizedAccountDeactivatedException();
      }

      // Update last login
      await this.usersService.updateLastLogin(user.id);

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedAccountDeactivatedException) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async login(user: User): Promise<{ access_token: string; user: LoginResponseUser }> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_active: user.is_active,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        last_login: user.last_login,
      },
    };
  }
}

export class UnauthorizedAccountDeactivatedException extends UnauthorizedException {
  constructor() {
    super('Account has been deactivated');
  }
}
