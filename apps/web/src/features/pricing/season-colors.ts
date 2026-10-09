/** Kolory sezonów (z palety: zieleń, terakota, slate, piasek) – rotacja po kolejnych stawkach. */
const SEASON_COLORS = [
  'bg-primary text-primary-foreground',
  'bg-highlight-strong text-highlight-foreground',
  'bg-status-completed-foreground text-white',
  'bg-sand text-foreground',
] as const;

export function seasonColor(index: number): string {
  return SEASON_COLORS[index % SEASON_COLORS.length] ?? SEASON_COLORS[0];
}
