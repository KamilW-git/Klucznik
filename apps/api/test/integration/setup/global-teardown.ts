import type { IntegrationGlobals } from './global-setup';

export default async function globalTeardown(): Promise<void> {
  await (globalThis as IntegrationGlobals).__POSTGRES_CONTAINER__?.stop();
}
