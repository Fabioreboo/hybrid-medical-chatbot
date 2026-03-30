import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/user.service';
import { UserRole } from './users/user.entity';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const configService = app.get(ConfigService);
  
  const email = configService.get<string>('ADMIN_EMAIL') || 'NOT_FOUND';
  console.log(`ConfigService says ADMIN_EMAIL is: ${email}`);
  
  const user = await usersService.findByEmail(email);
  if (user) {
    console.log(`Found user: ${user.name}, ID: ${user.id}, Role: ${user.role}`);
    if (user.role !== UserRole.ADMIN) {
        console.log("Upgrading user to ADMIN...");
        await usersService.makeAdmin(user.id);
        console.log("User upgraded successfully.");
    } else {
        console.log("User is already an ADMIN.");
    }
  } else {
    console.log("No user found with that email in current database.");
  }
  
  await app.close();
}

bootstrap();
