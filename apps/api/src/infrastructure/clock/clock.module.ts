import { Global, Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';

import { CLOCK } from '../../common/domain/clock';
import { appConfig } from '../../config/app.config';
import { SystemClock } from './system-clock';

/** Globalny port `CLOCK`. Testy nadpisują go `FixedClock` (`overrideProvider(CLOCK)`). */
@Global()
@Module({
  providers: [
    {
      provide: CLOCK,
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) => new SystemClock(config.timeZone),
    },
  ],
  exports: [CLOCK],
})
export class ClockModule {}
