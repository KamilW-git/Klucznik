import { Controller, Get } from '@nestjs/common';
import request from 'supertest';

import { Public } from '../../src/common/auth/public.decorator';
import { Roles } from '../../src/common/auth/roles.decorator';
import { createAdmin, createOwner } from '../factories';
import { accessTokenFor, bearer } from '../support/auth';
import { resetDatabase } from '../support/reset-database';
import { createTestApp, type TestApp } from './support/create-test-app';

// Sonda: trasy z każdym wariantem deklaracji dostępu.
@Controller('__authz')
class AuthzProbeController {
  @Get('public')
  @Public()
  open(): string {
    return 'ok';
  }

  @Get('owner')
  @Roles('OWNER')
  ownerOnly(): string {
    return 'ok';
  }

  @Get('any-role')
  @Roles('OWNER', 'ADMIN')
  anyRole(): string {
    return 'ok';
  }

  // Zapomniany dekorator ról.
  @Get('undeclared')
  undeclared(): string {
    return 'ok';
  }
}

describe('Global guards (JwtAuthGuard, RolesGuard)', () => {
  let ctx: TestApp;
  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp({ controllers: [AuthzProbeController] });
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('lets anyone into a @Public() route', async () => {
    await http().get('/api/v1/__authz/public').expect(200);
  });

  it('requires a token for a non-public route (401 before 403)', async () => {
    await http().get('/api/v1/__authz/owner').expect(401);
  });

  it('BR-12: returns 403 for a role outside @Roles()', async () => {
    const admin = await createAdmin(ctx.prisma);

    await http()
      .get('/api/v1/__authz/owner')
      .set(bearer(accessTokenFor(ctx.app, admin)))
      .expect(403);
    await http()
      .get('/api/v1/__authz/any-role')
      .set(bearer(accessTokenFor(ctx.app, admin)))
      .expect(200);
  });

  it('fails closed: a route without @Roles() and without @Public() returns 403 even for a valid token', async () => {
    const owner = await createOwner(ctx.prisma);

    await http()
      .get('/api/v1/__authz/undeclared')
      .set(bearer(accessTokenFor(ctx.app, owner)))
      .expect(403);
  });
});
