import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import type { AuthUser } from '../../../common/auth/auth-user';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Public } from '../../../common/auth/public.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { type AuthConfig, authConfig } from '../../../config/auth.config';
import { AuthService, type Session } from '../application/auth.service';
import { SessionInvalidError } from '../application/errors';
import { AuthResponseDto, LoginDto, MeDto } from './dto';
import {
  clearRefreshCookie,
  readRefreshCookie,
  REFRESH_COOKIE,
  setRefreshCookie,
} from './refresh-cookie';

const MINUTE_MS = 60_000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: MINUTE_MS } })
  @ApiOperation({
    summary: 'Logowanie e-mailem i hasłem; ustawia ciasteczko kl_refresh',
    operationId: 'Auth_login',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'INVALID_CREDENTIALS', type: ErrorResponseDto })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED (5/min)', type: ErrorResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.respond(res, await this.auth.login(dto.email, dto.password));
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: MINUTE_MS } })
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({
    summary: 'Nowy access token z ciasteczka kl_refresh (rotacja refresh tokenu)',
    operationId: 'Auth_refresh',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'UNAUTHORIZED', type: ErrorResponseDto })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED (20/min)', type: ErrorResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    try {
      return this.respond(res, await this.auth.refresh(readRefreshCookie(req.cookies)));
    } catch (error) {
      if (error instanceof SessionInvalidError) {
        clearRefreshCookie(res, this.config.cookieSecure);
      }
      throw error;
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(204)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({
    summary:
      'Wylogowanie: unieważnia refresh token z ciasteczka i czyści ciasteczko (idempotentne)',
    operationId: 'Auth_logout',
  })
  @ApiNoContentResponse()
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(readRefreshCookie(req.cookies));
    clearRefreshCookie(res, this.config.cookieSecure);
  }

  @Get('me')
  @Roles('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bieżący użytkownik', operationId: 'Auth_me' })
  @ApiOkResponse({ type: MeDto })
  @ApiUnauthorizedResponse({ description: 'UNAUTHORIZED', type: ErrorResponseDto })
  me(@CurrentUser() user: AuthUser): Promise<MeDto> {
    return this.auth.me(user.id);
  }

  private respond(res: Response, session: Session): AuthResponseDto {
    const { refreshToken, accessToken, expiresIn, user } = session;
    setRefreshCookie(res, refreshToken.token, refreshToken.expiresAt, this.config.cookieSecure);
    return { accessToken, expiresIn, user };
  }
}
