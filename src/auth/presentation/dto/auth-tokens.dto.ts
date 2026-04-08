import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensDto {
  @ApiProperty({ description: 'Short-lived JWT (15 min)', example: 'eyJhbGci...' })
  accessToken: string;

  @ApiProperty({ description: 'Long-lived opaque refresh token (7 days)', example: 'a3f8e2c1...' })
  refreshToken: string;
}
