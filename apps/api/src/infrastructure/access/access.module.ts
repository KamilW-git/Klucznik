import { Global, Module } from '@nestjs/common';

import { OWNERSHIP_POLICY } from '../../common/access/ownership.policy';
import { PrismaOwnershipPolicy } from './prisma-ownership.policy';

/** Globalny port `OWNERSHIP_POLICY` dla modułów panelu (BR-12). */
@Global()
@Module({
  providers: [{ provide: OWNERSHIP_POLICY, useClass: PrismaOwnershipPolicy }],
  exports: [OWNERSHIP_POLICY],
})
export class AccessModule {}
