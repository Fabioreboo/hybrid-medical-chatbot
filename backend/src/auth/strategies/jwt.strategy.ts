import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/user.service';
import { User } from '../../users/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }): Promise<User> {
    try {
      const user = await this.usersService.findById(payload.sub);
      if (!user.is_active) {
          throw new Error('User deactivated');
      }
      return user;
    } catch (error) {
       // Fallback to minimal user if findById fails (legacy behavior but safer to error out)
       return {
          id: payload.sub,
          email: payload.email,
          role: payload.role,
          google_id: '',
          name: '',
          is_active: true,
          avatar_url: '',
          created_at: new Date(),
          updated_at: new Date(),
        } as User;
    }
  }
}