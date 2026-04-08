export class RefreshToken {
  constructor(
    public readonly id: number,
    public readonly token: string,
    public readonly userId: number,
    public readonly expiresAt: Date,
    public readonly isRevoked: boolean,
    public readonly createdAt: Date,
  ) {}

  isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  isValid(): boolean {
    return !this.isRevoked && !this.isExpired();
  }
}
