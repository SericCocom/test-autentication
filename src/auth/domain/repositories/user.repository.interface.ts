import { User } from '../entities/user';

export const USER_REPOSITORY = Symbol('IUserRepository');

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  create(email: string, hashedPassword: string): Promise<User>;
}
