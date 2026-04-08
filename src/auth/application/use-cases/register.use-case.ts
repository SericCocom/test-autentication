import { ConflictException, Inject, Injectable } from '@nestjs/common';

import { USER_REPOSITORY, type IUserRepository } from '../../domain/repositories/user.repository.interface';
import { PASSWORD_HASHER, type IPasswordHasher } from '../ports/password-hasher.port';

export interface RegisterResult {
  id: number;
  email: string;
  createdAt: Date;
}

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(email: string, password: string): Promise<RegisterResult> {
    const exists = await this.userRepo.existsByEmail(email);
    if (exists) {
      throw new ConflictException('Email is already in use');
    }

    const hashedPassword = await this.passwordHasher.hash(password);
    const user = await this.userRepo.create(email, hashedPassword);

    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }
}
