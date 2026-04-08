import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/presentation/guards/jwt-auth.guard';
import { CurrentUser } from './auth/presentation/decorators/current-user.decorator';
import { CurrentUserResponseDto } from './auth/presentation/dto/current-user-response.dto';
import type { RequestUser } from './auth/presentation/dto/request-user.interface';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, schema: { example: 'Hello World!' } })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 200, type: CurrentUserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid Bearer token' })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: RequestUser): RequestUser {
    return user;
  }
}
