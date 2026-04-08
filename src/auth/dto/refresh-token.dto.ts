import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'a3f8e2c1d4b7...',
    description: 'The refresh token received during login or a previous refresh',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @ApiProperty({ example: 1, description: 'The id of the authenticated user' })
  @Type(() => Number)
  @IsNumber()
  userId: number;
}
