import { Global, Module } from '@nestjs/common';

import { PASSWORD_HASHER } from '../../common/security/password-hasher';
import { Argon2PasswordHasher } from './argon2-password-hasher';

/** Globalny port `PASSWORD_HASHER` (używany przez moduły `auth` i `users`). */
@Global()
@Module({
  providers: [{ provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher }],
  exports: [PASSWORD_HASHER],
})
export class SecurityModule {}
