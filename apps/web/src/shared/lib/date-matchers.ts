import { addDays, format } from 'date-fns';

import { parseApiDate } from './dates';

/** Zakres zajętych nocy: pobyt `[from, to)` (`exclusiveEnd`) albo blokada `[from, to]`. */
export interface NightRange {
  from: string;
  to: string;
  exclusiveEnd: boolean;
}

/**
 * Predykat „noc zajęta” dla `DateRangePicker` z rezerwacji i blokad pokoju
 * (zbiór dni `YYYY-MM-DD`, sprawdzanie w O(1)).
 */
export function occupiedNightPredicate(ranges: readonly NightRange[]): (night: Date) => boolean {
  const nights = new Set<string>();
  for (const range of ranges) {
    const end = parseApiDate(range.to);
    for (
      let day = parseApiDate(range.from);
      range.exclusiveEnd ? day < end : day <= end;
      day = addDays(day, 1)
    ) {
      nights.add(format(day, 'yyyy-MM-dd'));
    }
  }
  return (night) => nights.has(format(night, 'yyyy-MM-dd'));
}
