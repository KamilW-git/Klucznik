/**
 * Wartości zastępcze dla eksportu OpenAPI (`openapi:export`). Eksport buduje `AppModule` bez
 * połączeń z usługami, ale walidacja env działa przy imporcie modułu, a job CI `contract` nie ma `.env`.
 * Uzupełnia tylko brakujące zmienne, więc nie nadpisuje lokalnej konfiguracji.
 */
const PLACEHOLDERS: Record<string, string> = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://openapi:openapi@localhost:5432/openapi',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  JWT_ACCESS_SECRET: 'openapi-export-placeholder',
  APP_PUBLIC_URL: 'http://localhost:8080',
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  MAIL_FROM: 'openapi@klucznik.local',
  SCHEDULER_ENABLED: 'false',
};

export function applyOpenApiExportEnv(): void {
  for (const [key, value] of Object.entries(PLACEHOLDERS)) {
    process.env[key] ??= value;
  }
}
