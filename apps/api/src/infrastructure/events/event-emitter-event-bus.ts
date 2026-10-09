import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import type { DomainEvent } from '../../common/domain/domain-event';
import type { EventBus } from '../../common/events/event-bus';

/**
 * `EVENT_BUS` na `EventEmitter2`. Czeka na listenery (`emitAsync`), żeby zapis `EmailLog` i dodanie
 * joba zakończyły się przed odpowiedzią; sama wysyłka SMTP jest w workerze kolejki. Błąd listenera
 * jest logowany i nie wpływa na odpowiedź HTTP.
 */
@Injectable()
export class EventEmitterEventBus implements EventBus {
  private readonly logger = new Logger(EventEmitterEventBus.name);

  constructor(private readonly emitter: EventEmitter2) {}

  async publish(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      try {
        await this.emitter.emitAsync(event.name, event);
      } catch (error) {
        this.logger.error(
          `Listener of ${event.name} failed`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
