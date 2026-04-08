import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensDto {
  @ApiProperty({
    description: 'Short-lived JWT used to authenticate requests',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description:
      'Long-lived opaque token used to obtain a new access token. Store securely and never expose to JavaScript.',
    example: 'a3f8e2c1d4b7...',
  })
  refreshToken: string;
}
