import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { ACCESS_TOKEN_VERIFIER, type AccessTokenVerifier } from './auth-user';
import { IS_PUBLIC_KEY } from './public.decorator';

const BEARER = /^Bearer\s+(\S+)$/i;

/**
 * Globalny guard (po `ThrottlerGuard`): wymaga ważnego access tokenu w `Authorization: Bearer …`,
 * chyba że trasa ma `@Public()`. Brak lub nieważny token → 401 `UNAUTHORIZED`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ACCESS_TOKEN_VERIFIER) private readonly verifier: AccessTokenVerifier,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = BEARER.exec(request.get('authorization') ?? '')?.[1];
    const user = token ? this.verifier.verify(token) : null;
    if (!user) {
      throw new UnauthorizedException();
    }
    request.user = user;
    return true;
  }
}
