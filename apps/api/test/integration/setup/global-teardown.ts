import { rm } from 'node:fs/promises';

import type { IntegrationGlobals } from './global-setup';

export default async function globalTeardown(): Promise<void> {
  const globals = globalThis as IntegrationGlobals;
  await globals.__POSTGRES_CONTAINER__?.stop();
  if (globals.__UPLOADS_DIR__) {
    await rm(globals.__UPLOADS_DIR__, { recursive: true, force: true });
  }
}
