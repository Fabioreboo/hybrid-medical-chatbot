import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByGoogleId(googleId: string): Promise<User> {
    return this.usersRepository.findOne({ where: { google_id: googleId } });
  }

  async findByEmail(email: string): Promise<User> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(userData: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }): Promise<User> {
    // Check if user already exists
    const existingUser = await this.findByGoogleId(userData.googleId);
    if (existingUser) {
      return existingUser;
    }

    // Check if email already exists
    const emailUser = await this.findByEmail(userData.email);
    if (emailUser) {
      throw new ConflictException('Email already registered');
    }

    const user = this.usersRepository.create({
      google_id: userData.googleId,
      email: userData.email,
      name: userData.name,
      avatar_url: userData.avatarUrl,
    });

    return this.usersRepository.save(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      last_login: new Date(),
    });
  }

  async makeAdmin(userId: string): Promise<User> {
    const user = await this.findById(userId);
    user.role = UserRole.ADMIN;
    return this.usersRepository.save(user);
  }

  async getAllUsers(): Promise<User[]> {
    return this.usersRepository.find({
      order: { created_at: 'DESC' },
      select: ['id', 'email', 'name', 'role', 'is_active', 'created_at', 'last_login'],
    });
  }

  async deactivateUser(userId: string): Promise<User> {
    const user = await this.findById(userId);
    user.is_active = false;
    return this.usersRepository.save(user);
  }

  async activateUser(userId: string): Promise<User> {
    const user = await this.findById(userId);
    user.is_active = true;
    return this.usersRepository.save(user);
  }
}