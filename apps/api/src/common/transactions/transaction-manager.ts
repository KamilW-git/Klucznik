/**
 * Port transakcji (apps/api/docs/application-layer.md#transakcje). Serwisy aplikacyjne otwierają
 * transakcję przez `run`, a repozytoria automatycznie używają bieżącej transakcji z kontekstu.
 * Transakcja **nie** obejmuje wysyłki e-maili ani operacji na plikach.
 */
export interface TransactionManager {
  run<T>(fn: () => Promise<T>): Promise<T>;
}

export const TRANSACTION_MANAGER = Symbol('TRANSACTION_MANAGER');
