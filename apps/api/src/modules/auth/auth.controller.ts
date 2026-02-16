import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Auth Controller - User profile management and authentication endpoints.
 *
 * Ported from backend/routers/auth.py.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * GET /auth/me
   * Get current authenticated user's profile.
   */
  @Get('me')
  async getCurrentUserProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  /**
   * PUT /auth/me
   * Update current authenticated user's profile.
   */
  @Put('me')
  async updateCurrentUserProfile(
    @CurrentUser('id') userId: string,
    @Body() updateData: { fullName?: string; avatarUrl?: string },
  ) {
    return this.authService.updateProfile(userId, updateData);
  }

  /**
   * POST /auth/password-reset/confirm
   * Confirm password reset using Supabase recovery token.
   * Rate limited to 5 requests per minute.
   */
  @Public()
  @Post('password-reset/confirm')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async confirmPasswordReset(
    @Body() data: { token: string; newPassword: string },
  ) {
    return this.authService.confirmPasswordReset(data.token, data.newPassword);
  }

  /**
   * POST /auth/signup/invite
   * Register a new user using a workspace invitation token.
   * Rate limited to 10 requests per minute.
   */
  @Public()
  @Post('signup/invite')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async signupWithInvite(
    @Body()
    data: {
      email: string;
      password: string;
      fullName: string;
      inviteToken: string;
    },
  ) {
    return this.authService.completeInviteSignup(data);
  }

  /**
   * GET /auth/invite/:token/validate
   * Validate a workspace invitation token.
   * Rate limited to 30 requests per minute.
   */
  @Public()
  @Get('invite/:token/validate')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async validateInviteToken(@Param('token') token: string) {
    return this.authService.validateInviteToken(token);
  }
}
