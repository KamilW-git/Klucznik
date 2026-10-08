import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import type { Role } from './auth-user';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ROLES_KEY } from './roles.decorator';

/**
 * Globalny guard ról (BR-12, po `JwtAuthGuard`): rola spoza `@Roles()` → 403 `FORBIDDEN`.
 * Fail-closed: trasa niepubliczna bez `@Roles()` jest odrzucana, żeby zapomniany dekorator
 * nie otworzył endpointu panelu dla dowolnej roli.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    if (!roles || roles.length === 0) {
      this.logger.warn(
        `Route ${context.getClass().name}.${context.getHandler().name} has neither @Roles() nor @Public()`,
      );
      throw new ForbiddenException();
    }

    const user = context.switchToHttp().getRequest<Request>().user;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException();
    }
    return true;
  }
}
