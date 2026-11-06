import { type ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthUser } from './auth-user';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Roles('ADMIN')
class AdminOnlyController {
  list(): string {
    return 'admin';
  }

  @Roles('OWNER', 'ADMIN')
  shared(): string {
    return 'shared';
  }

  @Public()
  open(): string {
    return 'public';
  }
}

class UndecoratedController {
  forgotten(): string {
    return 'forgotten';
  }
}

type Controller = typeof AdminOnlyController | typeof UndecoratedController;

function contextFor(controller: Controller, method: string, user?: AuthUser): ExecutionContext {
  const handler = (controller.prototype as unknown as Record<string, () => string>)[method];
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const OWNER: AuthUser = { id: '6f0c2a7e-4c1b-4a8e-9a43-1d6f5f1c2b3a', role: 'OWNER' };
const ADMIN: AuthUser = { id: '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d', role: 'ADMIN' };

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  // Ostrzeżenie o trasie bez `@Roles()` jest oczekiwane w teście fail-closed.
  beforeAll(() => {
    Logger.overrideLogger(false);
  });

  it('BR-12: OWNER on an ADMIN-only route → 403 FORBIDDEN', () => {
    expect(() => guard.canActivate(contextFor(AdminOnlyController, 'list', OWNER))).toThrow(
      ForbiddenException,
    );
  });

  it('BR-12: a role listed in @Roles() passes', () => {
    expect(guard.canActivate(contextFor(AdminOnlyController, 'list', ADMIN))).toBe(true);
  });

  it('BR-12: method-level @Roles() overrides the controller roles', () => {
    expect(guard.canActivate(contextFor(AdminOnlyController, 'shared', OWNER))).toBe(true);
  });

  it('BR-12: a route without @Roles() and @Public() is rejected even for ADMIN (fail-closed)', () => {
    expect(() => guard.canActivate(contextFor(UndecoratedController, 'forgotten', ADMIN))).toThrow(
      ForbiddenException,
    );
  });

  it('BR-12: a request without a user is rejected on a protected route', () => {
    expect(() => guard.canActivate(contextFor(AdminOnlyController, 'shared'))).toThrow(
      ForbiddenException,
    );
  });

  it('@Public() routes pass without a user', () => {
    expect(guard.canActivate(contextFor(AdminOnlyController, 'open'))).toBe(true);
  });
});
