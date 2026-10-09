import { Inject, Injectable } from '@nestjs/common';

import type { AccessScope } from '../../../common/access/access-scope';
import { OWNERSHIP_POLICY, type OwnershipPolicy } from '../../../common/access/ownership.policy';
import type { CalendarDate } from '../../../common/domain/calendar-date';
import { AVAILABILITY_REPOSITORY, type AvailabilityRepository, type Calendar } from './ports';

/** Kalendarz obłożenia obiektu (docs/features/availability.md): jedno żądanie, stała liczba zapytań. */
@Injectable()
export class CalendarService {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
    @Inject(OWNERSHIP_POLICY) private readonly ownership: OwnershipPolicy,
  ) {}

  async get(
    propertyId: string,
    scope: AccessScope,
    from: CalendarDate,
    to: CalendarDate,
  ): Promise<Calendar> {
    const property = await this.ownership.assertProperty(propertyId, scope); // BR-12
    return this.availability.calendar(property.id, from, to);
  }
}
