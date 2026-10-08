import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { IsInt, IsString, Min, MinLength } from 'class-validator';
import request, { type Response } from 'supertest';

import { Public } from '../../src/common/auth/public.decorator';
import { DomainError } from '../../src/common/domain/domain-error';
import { NotFoundError } from '../../src/common/errors/not-found.error';
import type { ErrorResponseDto } from '../../src/common/http/error-response.dto';
import { createTestApp, type TestApp } from './support/create-test-app';

const errorBody = (res: Response): ErrorResponseDto => res.body as ErrorResponseDto;

// --- Sonda: kontroler istniejący tylko w tym teście, wywołujący każdy rodzaj błędu. ---

class ProbeBodyDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsInt()
  @Min(1)
  guestsCount: number;
}

class ProbeCapacityError extends DomainError {
  readonly code = 'CAPACITY_EXCEEDED';
}

@Public()
@Controller('__probe')
class ProbeController {
  @Post('body')
  body(@Body() body: ProbeBodyDto): ProbeBodyDto {
    return body;
  }

  @Get('domain-error')
  domainError(): never {
    throw new ProbeCapacityError('Liczba gości przekracza pojemność pokoju.', { capacity: 4 });
  }

  @Get('not-found')
  notFound(): never {
    throw new NotFoundError('Room', 'b6a1c1d2-0000-4000-8000-000000000000');
  }

  @Get('crash')
  crash(): never {
    throw new Error('connection string with secret-password leaked');
  }

  @Get('custom-code')
  customCode(): never {
    throw new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'Nieprawidłowy e-mail lub hasło.',
    });
  }

  @Get('uuid/:id')
  uuid(@Param('id', ParseUUIDPipe) id: string): { id: string } {
    return { id };
  }
}

describe('Error response format (ErrorResponseDto)', () => {
  let ctx: TestApp;
  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp({ controllers: [ProbeController] });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('returns 400 VALIDATION_ERROR with details.fields for an invalid body', async () => {
    const res = await http()
      .post('/api/v1/__probe/body')
      .send({ name: 'A', guestsCount: 0 })
      .expect(400);

    expect(res.body).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      code: 'VALIDATION_ERROR',
      message: expect.any(String) as unknown,
      details: {
        fields: [
          { field: 'name', messages: ['name must be longer than or equal to 2 characters'] },
          { field: 'guestsCount', messages: ['guestsCount must not be less than 1'] },
        ],
      },
      path: '/api/v1/__probe/body',
      timestamp: '2026-08-01T08:00:00.000Z',
      requestId: res.headers['x-request-id'] as string,
    });
  });

  it('rejects unknown fields, e.g. a client-sent price (BR-05, forbidNonWhitelisted)', async () => {
    const res = await http()
      .post('/api/v1/__probe/body')
      .send({ name: 'Anna', guestsCount: 2, totalPrice: 1 })
      .expect(400);

    expect(errorBody(res).code).toBe('VALIDATION_ERROR');
    expect(errorBody(res).details?.fields).toEqual([
      { field: 'totalPrice', messages: ['property totalPrice should not exist'] },
    ]);
  });

  it('returns 400 VALIDATION_ERROR for malformed JSON', async () => {
    const res = await http()
      .post('/api/v1/__probe/body')
      .set('Content-Type', 'application/json')
      .send('{"name": ')
      .expect(400);

    expect(errorBody(res).code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR for an invalid UUID parameter', async () => {
    const res = await http().get('/api/v1/__probe/uuid/not-a-uuid').expect(400);

    expect(errorBody(res).code).toBe('VALIDATION_ERROR');
  });

  it('maps a DomainError to its status, code, message and details', async () => {
    const res = await http().get('/api/v1/__probe/domain-error').expect(422);

    expect(res.body).toMatchObject({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'CAPACITY_EXCEEDED',
      message: 'Liczba gości przekracza pojemność pokoju.',
      details: { capacity: 4 },
    });
  });

  it('BR-12: maps NotFoundError to 404 NOT_FOUND', async () => {
    const res = await http().get('/api/v1/__probe/not-found').expect(404);

    expect(res.body).toMatchObject({ code: 'NOT_FOUND', path: '/api/v1/__probe/not-found' });
  });

  it('returns 404 NOT_FOUND in the same format for an unknown route', async () => {
    const res = await http().get('/api/v1/does-not-exist?x=1').expect(404);

    expect(res.body).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      path: '/api/v1/does-not-exist?x=1',
    });
  });

  it('keeps a custom code thrown with HttpException (e.g. INVALID_CREDENTIALS)', async () => {
    const res = await http().get('/api/v1/__probe/custom-code').expect(401);

    expect(res.body).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'Nieprawidłowy e-mail lub hasło.',
    });
  });

  it('returns 500 INTERNAL_ERROR without leaking internal details', async () => {
    const res = await http().get('/api/v1/__probe/crash').expect(500);

    expect(res.body).toMatchObject({ statusCode: 500, code: 'INTERNAL_ERROR' });
    expect(JSON.stringify(res.body)).not.toContain('secret-password');
    expect(res.body).not.toHaveProperty('stack');
  });

  it('echoes a valid incoming X-Request-Id in the header and the body', async () => {
    const res = await http()
      .get('/api/v1/__probe/not-found')
      .set('X-Request-Id', 'trace-abc_123')
      .expect(404);

    expect(res.headers['x-request-id']).toBe('trace-abc_123');
    expect(errorBody(res).requestId).toBe('trace-abc_123');
  });

  it('replaces an unsafe incoming X-Request-Id', async () => {
    const res = await http()
      .get('/api/v1/__probe/not-found')
      .set('X-Request-Id', 'bad id\twith spaces')
      .expect(404);

    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
