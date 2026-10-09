/** Numer rezerwacji `KL-RRRR-NNNNNN` z globalnego licznika na rok (Q-12). */
export function formatReservationNumber(year: number, sequence: number): string {
  return `KL-${year}-${String(sequence).padStart(6, '0')}`;
}
