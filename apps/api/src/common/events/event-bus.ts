import type { DomainEvent } from '../domain/domain-event';

/**
 * Port publikacji zdarzeń (apps/api/docs/integrations.md#porty-techniczne). Serwisy wywołują `publish`
 * **po commicie** transakcji. Implementacja czeka na listenery, ale ich błędy tylko loguje:
 * publikacja nigdy nie zmienia wyniku operacji, która już się udała.
 */
export interface EventBus {
  publish(events: readonly DomainEvent[]): Promise<void>;
}

export const EVENT_BUS = Symbol('EVENT_BUS');
