import type { Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/app.setup';
import { CLOCK, FixedClock } from '../../../src/common/domain/clock';

/** Domyślne „teraz” testów integracyjnych (docs/architecture/testing-strategy.md#zegar-w-testach). */
export const TEST_NOW = '2026-08-01T10:00:00+02:00';

export interface TestApp {
  app: NestExpressApplication;
  clock: FixedClock;
}

export interface TestAppOptions {
  /** Dodatkowe kontrolery tylko na potrzeby testu (np. sondy formatu błędów). */
  controllers?: Type[];
  now?: string;
}

/**
 * Prawdziwy `AppModule` z konfiguracją HTTP jak w `main.ts`.
 * Nadpisany jest tylko `CLOCK` (`FixedClock`); kolejne etapy dodadzą fake mailera i kolejki.
 */
export async function createTestApp(options: TestAppOptions = {}): Promise<TestApp> {
  const clock = FixedClock.at(options.now ?? TEST_NOW);

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  })
    .overrideProvider(CLOCK)
    .useValue(clock)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app);
  await app.init();

  return { app, clock };
}
