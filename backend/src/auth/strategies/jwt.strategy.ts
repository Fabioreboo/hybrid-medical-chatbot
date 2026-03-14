import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../../users/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }): Promise<User> {
    // In a real implementation, you would fetch the user from the database here
    // For now, we'll return a user object with the payload data
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