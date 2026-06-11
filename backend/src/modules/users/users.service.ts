import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  // TODO: Replace with Supabase/TypeORM repository
  private users: User[] = [];

  async create(dto: CreateUserDto): Promise<User> {
    const user: User = {
      id: Date.now().toString(),
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
      bio: dto.bio ?? null,
      avatarUrl: null,
      createdAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async findById(id: string): Promise<User> {
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, dto);
    return user;
  }
}
