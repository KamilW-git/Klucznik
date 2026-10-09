import type { Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/app.setup';
import { CLOCK, FixedClock } from '../../../src/common/domain/clock';
import { MAILER } from '../../../src/common/mail/mailer';
import { PrismaService } from '../../../src/infrastructure/prisma/prisma.service';
import { FakeMailer } from '../../support/fake-mailer';

/** Domyślne „teraz” testów integracyjnych (docs/architecture/testing-strategy.md#zegar-w-testach). */
export const TEST_NOW = '2026-08-01T10:00:00+02:00';

export interface TestApp {
  app: NestExpressApplication;
  clock: FixedClock;
  /** E-maile „wysłane” przez kolejkę inline (`EMAIL_QUEUE_DRIVER=inline`). */
  mailer: FakeMailer;
  /** Do przygotowania danych (fabryki) i asercji na bazie. */
  prisma: PrismaService;
}

export interface TestAppOptions {
  /** Dodatkowe kontrolery tylko na potrzeby testu (np. sondy formatu błędów). */
  controllers?: Type[];
  now?: string;
}

/**
 * Prawdziwy `AppModule` z konfiguracją HTTP jak w `main.ts`.
 * Nadpisane są `CLOCK` (`FixedClock`) i `MAILER` (`FakeMailer`); kolejka e-maili działa inline.
 */
export async function createTestApp(options: TestAppOptions = {}): Promise<TestApp> {
  const clock = FixedClock.at(options.now ?? TEST_NOW);
  const mailer = new FakeMailer();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  })
    .overrideProvider(CLOCK)
    .useValue(clock)
    .overrideProvider(MAILER)
    .useValue(mailer)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app);
  await app.init();

  return { app, clock, mailer, prisma: app.get(PrismaService) };
}
