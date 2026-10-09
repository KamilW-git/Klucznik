/**
 * Zdarzenie domenowe: niemutowalny obiekt z nazwą (`reservation.created`) i chwilą wystąpienia
 * (docs/architecture/async-and-jobs.md#zdarzenia-domenowe). Publikuje je port `EVENT_BUS`.
 */
export interface DomainEvent {
  readonly name: string;
  readonly occurredAt: Date;
}
