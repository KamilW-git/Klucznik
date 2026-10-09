import { DomainError } from '../../../common/domain/domain-error';

/**
 * BR-09: stawka nakłada się na inną stawkę pokoju (409). `details` wskazuje kolidującą stawkę;
 * przy wyścigu wykrytym dopiero przez constraint w bazie `details` może być puste.
 */
export class SeasonalRateOverlapError extends DomainError {
  readonly code = 'SEASONAL_RATE_OVERLAP';

  constructor(conflicting?: { id: string; name: string }) {
    super(
      'Stawka nakłada się na inną stawkę sezonową tego pokoju.',
      conflicting
        ? { conflictingRateId: conflicting.id, conflictingRateName: conflicting.name }
        : undefined,
    );
  }
}

/** BR-03: pobyt krótszy niż minimalny (422). `details.minNights` dla komunikatu w UI. */
export class MinNightsNotMetError extends DomainError {
  readonly code = 'MIN_NIGHTS_NOT_MET';

  constructor(minNights: number, nights: number) {
    super(`Minimalna liczba nocy w tym terminie: ${minNights}.`, { minNights, nights });
  }
}
