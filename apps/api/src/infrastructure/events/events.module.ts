import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { EVENT_BUS } from '../../common/events/event-bus';
import { EventEmitterEventBus } from './event-emitter-event-bus';

/** Zdarzenia domenowe w procesie (ADR 0005). Globalny port `EVENT_BUS`. */
@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [{ provide: EVENT_BUS, useClass: EventEmitterEventBus }],
  exports: [EVENT_BUS],
})
export class EventsModule {}
