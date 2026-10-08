import request from 'supertest';

import { createTestApp, type TestApp } from './support/create-test-app';

describe('GET /api/v1/health', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 200 with the database up, without authentication', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(res.body).toMatchObject({ status: 'ok', details: { database: { status: 'up' } } });
  });

  it('returns 503 SERVICE_UNAVAILABLE with indicator results when the database is down (Q-27)', async () => {
    jest.spyOn(ctx.prisma, '$queryRaw').mockRejectedValueOnce(new Error('connection refused'));

    const res = await request(ctx.app.getHttpServer()).get('/api/v1/health').expect(503);

    expect(res.body).toMatchObject({
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      details: {
        status: 'error',
        error: { database: { status: 'down', message: 'connection refused' } },
      },
    });
  });

  it('sets security headers (helmet) and hides the framework', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api/v1/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('generates X-Request-Id when the client does not send one', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api/v1/health');

    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('is not served without the /api/v1 prefix', async () => {
    await request(ctx.app.getHttpServer()).get('/health').expect(404);
  });
});
