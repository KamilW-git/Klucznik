import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { ACCESS_TOKEN_VERIFIER } from '../../common/auth/auth-user';
import { type AuthConfig, authConfig } from '../../config/auth.config';
import { AuthService } from './application/auth.service';
import { AUTH_ACCOUNTS_REPOSITORY, REFRESH_TOKENS_REPOSITORY } from './application/ports';
import { SessionsService } from './application/sessions.service';
import { TokenService } from './application/token.service';
import { AuthController } from './http/auth.controller';
import {
  PrismaAuthAccountsRepository,
  PrismaRefreshTokensRepository,
} from './infrastructure/prisma-auth.repositories';

/**
 * Uwierzytelnianie (docs/features/auth.md). Globalny, bo `ACCESS_TOKEN_VERIFIER` jest potrzebny
 * globalnemu `JwtAuthGuard`. Eksport dla innych modułów: `SessionsService`, `TokenService`.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [authConfig.KEY],
      useFactory: (config: AuthConfig) => ({
        secret: config.jwtSecret,
        signOptions: { algorithm: 'HS256' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionsService,
    TokenService,
    { provide: ACCESS_TOKEN_VERIFIER, useExisting: TokenService },
    { provide: AUTH_ACCOUNTS_REPOSITORY, useClass: PrismaAuthAccountsRepository },
    { provide: REFRESH_TOKENS_REPOSITORY, useClass: PrismaRefreshTokensRepository },
  ],
  exports: [ACCESS_TOKEN_VERIFIER, SessionsService, TokenService],
})
export class AuthModule {}
