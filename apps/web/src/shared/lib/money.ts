/** Kwoty z API są w groszach (ADR 0007). Wyświetlanie: „1 640 zł”, a z groszami „1 640,50 zł”. */

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, fractionDigits: number): Intl.NumberFormat {
  const key = `${currency}:${fractionDigits}`;
  let instance = formatters.get(key);
  if (!instance) {
    instance = new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      // Separator tysięcy także dla liczb 4-cyfrowych („1 640 zł”, nie „1640 zł”).
      useGrouping: 'always',
    });
    formatters.set(key, instance);
  }
  return instance;
}

/** Grosze → tekst; pełne złote bez części dziesiętnej. */
export function formatMoney(minor: number, currency = 'PLN'): string {
  const fractionDigits = minor % 100 === 0 ? 0 : 2;
  return formatter(currency, fractionDigits).format(fromMinor(minor));
}

/** Złote (pole formularza) → grosze dla API. */
export function toMinor(major: number): number {
  return Math.round(major * 100);
}

/** Grosze z API → złote (pole formularza). */
export function fromMinor(minor: number): number {
  return minor / 100;
}
