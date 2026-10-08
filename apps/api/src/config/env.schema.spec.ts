import { InvalidEnvError, parseEnv } from './env.schema';

const validEnv = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://klucznik:secret@localhost:5433/klucznik',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  JWT_ACCESS_SECRET: 'a-very-long-development-secret-with-32-chars',
  APP_PUBLIC_URL: 'http://localhost:8080',
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  MAIL_FROM: '"Klucznik" <no-reply@klucznik.local>',
};

function issuesOf(raw: Record<string, unknown>): string[] {
  try {
    parseEnv(raw);
    return [];
  } catch (error) {
    if (error instanceof InvalidEnvError) {
      return error.issues;
    }
    throw error;
  }
}

describe('parseEnv', () => {
  it('parses a valid environment and applies defaults', () => {
    const env = parseEnv(validEnv);
    expect(env).toMatchObject({
      PORT: 3000,
      REDIS_PORT: 6379,
      APP_TIMEZONE: 'Europe/Warsaw',
      CORS_ORIGINS: [],
      SWAGGER_ENABLED: true,
      COOKIE_SECURE: false,
      UPLOAD_MAX_BYTES: 10_485_760,
    });
  });

  it('treats empty values as missing, so defaults apply', () => {
    const env = parseEnv({ ...validEnv, PORT: '', SMTP_USER: '' });
    expect(env.PORT).toBe(3000);
    expect(env.SMTP_USER).toBe('');
  });

  it('parses booleans and the CORS origin list', () => {
    const env = parseEnv({
      ...validEnv,
      SWAGGER_ENABLED: 'false',
      COOKIE_SECURE: 'true',
      CORS_ORIGINS: 'http://localhost:5173, http://127.0.0.1:5173',
    });
    expect(env.SWAGGER_ENABLED).toBe(false);
    expect(env.COOKIE_SECURE).toBe(true);
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:5173', 'http://127.0.0.1:5173']);
  });

  it('reports all missing required variables at once', () => {
    const issues = issuesOf({ NODE_ENV: 'development' });
    for (const key of [
      'DATABASE_URL',
      'REDIS_HOST',
      'JWT_ACCESS_SECRET',
      'SMTP_HOST',
      'MAIL_FROM',
    ]) {
      expect(issues.some((issue) => issue.startsWith(`${key}:`))).toBe(true);
    }
  });

  it.each([
    ['DATABASE_URL', 'mysql://localhost/klucznik'],
    ['PORT', 'abc'],
    ['APP_TIMEZONE', 'Europe/Nowhere'],
    ['CORS_ORIGINS', 'not a url'],
    ['NODE_ENV', 'staging'],
  ])('rejects invalid %s=%s', (key, value) => {
    // Dla list ścieżka wskazuje element, np. `CORS_ORIGINS.0: Invalid URL`.
    expect(issuesOf({ ...validEnv, [key]: value })[0]).toMatch(new RegExp(`^${key}[.:]`));
  });

  it('requires a JWT secret of at least 32 characters outside tests', () => {
    expect(issuesOf({ ...validEnv, JWT_ACCESS_SECRET: 'short' })[0]).toMatch(/^JWT_ACCESS_SECRET:/);
  });

  it('allows a short JWT secret with NODE_ENV=test', () => {
    expect(() =>
      parseEnv({ ...validEnv, NODE_ENV: 'test', JWT_ACCESS_SECRET: 'short' }),
    ).not.toThrow();
  });

  it('rejects the .env.example placeholder secret in production', () => {
    const issues = issuesOf({
      ...validEnv,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'change-me-to-a-random-string-of-at-least-32-chars',
    });
    expect(issues[0]).toMatch(/^JWT_ACCESS_SECRET:/);
  });
});
