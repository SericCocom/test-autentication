import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import { CurrentUserResponseDto } from './auth/dto/current-user-response.dto';
import type { RequestUser } from './auth/interfaces/request-user.interface';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Health check', description: 'Returns a greeting. No auth required.' })
  @ApiResponse({ status: 200, description: 'OK', schema: { example: 'Hello World!' } })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the payload decoded from the Bearer access token.',
  })
  @ApiBearerAuth('access-token')
  @ApiResponse({
    status: 200,
    description: 'Authenticated user data',
    type: CurrentUserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid Bearer token' })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: RequestUser): RequestUser {
    return user;
  }
}
