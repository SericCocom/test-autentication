import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'a3f8e2c1d4b7...', description: 'The refresh token received at login' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @ApiProperty({ example: 1, description: 'The id of the authenticated user' })
  @Type(() => Number)
  @IsNumber()
  userId: number;
}
