import { ApiProperty } from '@nestjs/swagger';

export class CurrentUserResponseDto {
  @ApiProperty({ example: 1, description: 'Internal user id (from JWT sub)' })
  userId: number;

  @ApiProperty({ example: 'user@example.com' })
  email: string;
}
