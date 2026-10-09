import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Testy strony publicznej: „dziś” = 1.08.2027 (tylko `Date`, timery prawdziwe), więc kalendarz
 * pokazuje sierpień 2027, a daty z `STAY` są w przyszłości niezależnie od dnia uruchomienia.
 */
export function setupPublicTestDate() {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2027-08-01T10:00:00') });
  });
  afterEach(() => {
    vi.useRealTimers();
  });
}

/** Dzień miesiąca w pierwszym widocznym kalendarzu (opcjonalnie w obrębie kontenera). */
export async function findDay(label: string, container: HTMLElement = document.body) {
  const grid = (await within(container).findAllByRole('grid'))[0]!;
  const button = within(grid)
    .getAllByRole('button')
    .find((element) => element.textContent === label);
  if (!button) throw new Error(`Brak dnia ${label} w kalendarzu`);
  return button;
}

/** Formularz wyszukiwania pobytu (P1 hero, P2 „Zmień”). */
export function searchForm() {
  return screen.getByRole('search', { name: 'Sprawdź dostępność' });
}
