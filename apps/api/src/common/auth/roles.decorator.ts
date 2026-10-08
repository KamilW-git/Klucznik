import { SetMetadata } from '@nestjs/common';

import type { Role } from './auth-user';

export const ROLES_KEY = 'roles';

/**
 * Wymagane role (BR-12). Brak roli → 403 `FORBIDDEN`. Każdy kontroler niepubliczny musi je deklarować:
 * `RolesGuard` odrzuca trasy bez `@Roles()` i bez `@Public()`.
 */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
