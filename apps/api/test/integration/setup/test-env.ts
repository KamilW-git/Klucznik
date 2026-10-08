// Zmienne środowiskowe testów integracyjnych. `DATABASE_URL` ustawia global-setup.ts.
// `??=` pozwala nadpisać wartości w CI. Lokalny `.env` jest pomijany przy NODE_ENV=test.

process.env.NODE_ENV = 'test';

const defaults: Record<string, string> = {
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  JWT_ACCESS_SECRET: 'integration-test-secret',
  APP_PUBLIC_URL: 'http://localhost:8080',
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  MAIL_FROM: 'test@klucznik.local',
  SWAGGER_ENABLED: 'false',
  SCHEDULER_ENABLED: 'false',
  // Mały limit, żeby test 413 nie generował 10 MB.
  UPLOAD_MAX_BYTES: String(256 * 1024),
};

for (const [key, value] of Object.entries(defaults)) {
  process.env[key] ??= value;
}
