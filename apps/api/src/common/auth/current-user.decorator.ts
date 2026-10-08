import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthUser } from './auth-user';

/** `AuthUser` z access tokenu. Na trasie publicznej (bez `req.user`) rzuca 401. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const user = ctx.switchToHttp().getRequest<Request>().user;
  if (!user) {
    throw new UnauthorizedException();
  }
  return user;
});
