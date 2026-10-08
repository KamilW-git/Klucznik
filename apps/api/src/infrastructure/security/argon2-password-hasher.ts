import { Injectable } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';

import type { PasswordHasher } from '../../common/security/password-hasher';

/** argon2id z parametrami domyślnymi biblioteki `argon2`. */
@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return hash(plain, { type: argon2id });
  }

  async verify(hashed: string, plain: string): Promise<boolean> {
    try {
      return await verify(hashed, plain);
    } catch {
      // Uszkodzony lub obcy format hasha traktujemy jak złe hasło.
      return false;
    }
  }
}
