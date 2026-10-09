import { CalendarDate } from '../../common/domain/calendar-date';

/** Grosze → „1 640,00 zł” (spacja jako separator tysięcy, przecinek dziesiętny). */
export function formatMoney(amount: number, currency = 'PLN'): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(amount));
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const fraction = String(abs % 100).padStart(2, '0');
  return `${sign}${whole},${fraction} ${currency === 'PLN' ? 'zł' : currency}`;
}

/** `YYYY-MM-DD` → „14.08.2026”. */
export function formatDate(value: string): string {
  const date = CalendarDate.parse(value).toString();
  return `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}`;
}

/** Chwila (ISO) → „03.08.2026, 10:00” w strefie aplikacji. */
export function formatDateTime(value: string | Date, timeZone: string): string {
  const instant = typeof value === 'string' ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat('pl-PL', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${part('day')}.${part('month')}.${part('year')}, ${part('hour')}:${part('minute')}`;
}

/** „1 noc”, „2 noce”, „5 nocy”, „22 noce”, „12 nocy”. */
export function pluralNights(count: number): string {
  if (count === 1) {
    return '1 noc';
  }
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  const few = lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14);
  return `${count} ${few ? 'noce' : 'nocy'}`;
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&#x3D;': '=',
  '&#x60;': '`',
  '&nbsp;': ' ',
};

/** Wersja tekstowa e-maila z HTML: linki jako „tekst (adres)”, bloki w osobnych liniach. */
export function htmlToText(html: string): string {
  return (
    html
      .replace(/<(style|head)[\s\S]*?<\/\1>/gi, '')
      // Łamanie wierszy w źródle HTML nie ma znaczenia; wiersze wyznaczają dopiero znaczniki blokowe.
      .replace(/\s+/g, ' ')
      .replace(
        /<a\s[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi,
        (_, _quote: string, href: string, label: string) => {
          const text = label.replace(/<[^>]+>/g, '').trim();
          return text && text !== href ? `${text} (${href})` : href;
        },
      )
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|tr|li|table)>/gi, '\n')
      .replace(/<\/td>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&[#\w]+;/g, (entity) => ENTITIES[entity] ?? entity)
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}
