import { pluralize } from '@/shared/lib/dates';

/** BR-08 jako tekst dla gościa: „Bezpłatne anulowanie do 7 dni przed przyjazdem”. */
export function formatCancellationPolicy(deadlineDays: number): string {
  if (deadlineDays <= 0) return 'Bezpłatne anulowanie do dnia przyjazdu';
  return `Bezpłatne anulowanie do ${deadlineDays} ${pluralize(deadlineDays, 'dnia', 'dni', 'dni')} przed przyjazdem`;
}

/** BR-07 jako tekst dla gościa: „w ciągu 48 godzin”. */
export function formatConfirmationTime(hours: number): string {
  return `w ciągu ${hours} ${pluralize(hours, 'godziny', 'godzin', 'godzin')}`;
}

/** „ul. Leśna 14, 11-700 Mrągowo” (puste części pomijane). */
export function formatAddress(parts: {
  street: string | null;
  postalCode: string | null;
  city: string | null;
}): string {
  const town = [parts.postalCode, parts.city].filter(Boolean).join(' ');
  return [parts.street, town].filter(Boolean).join(', ');
}

/** Wyszukiwanie adresu w mapach (model nie ma współrzędnych, Q-28). */
export function mapSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
