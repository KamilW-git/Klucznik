# Design system (szkielet)

> Tokeny kolorów, typografia, odstępy, komponenty i statusy. **Szkielet do uzupełnienia w pierwszej sesji `UI` (M10)** na podstawie ekranów z [design/stitch/](../../../design/README.md).
> Implementacja: Tailwind CSS (tokeny jako CSS variables w `src/app/styles.css` + `tailwind.config`) + shadcn/ui.

## Status

| Element | Status |
|-|-|
| Wybór wariantu stylu (A/B/C) | ☐ do decyzji użytkownika po wygenerowaniu ekranów ([02-prompty-stitch.md](../../../docs/prompts/02-prompty-stitch.md#warianty-stylu-wybierz-jeden)) |
| Tokeny kolorów | ☐ TODO (M10) |
| Typografia | ☐ TODO (M10) |
| Komponenty bazowe | ☐ TODO (M10) |

## Warianty stylu (z promptów Stitch)

Po wyborze zostaw tylko wybrany wariant (lub kombinację, np. A dla strony publicznej i B dla panelu) i przenieś jego wartości do tokenów poniżej.

| Wariant | Tło | Primary | Akcent | Tekst | Promień | Font |
|-|-|-|-|-|-|-|
| A „Leśna przystań” | `#FAF7F2` | `#2F5D50` | `#C8754A` | `#1F2A24` | 12–16 px | Nunito / DM Sans |
| B „Czysty SaaS” | `#FFFFFF` / `#F6F7F9` | `#0F766E` | – (border `#E5E7EB`) | `#111827` | 8 px | Inter |
| C „Butik” | `#F4EFE6` | `#1E2A3A` | `#B08D57` | charcoal | 6 px | Fraunces + Inter |

## Tokeny (do uzupełnienia)

Nazwy semantyczne zgodne z konwencją shadcn/ui (CSS variables w HSL):

| Token | Zastosowanie | Wartość |
|-|-|-|
| `--background`, `--foreground` | tło i tekst strony | TODO |
| `--card`, `--card-foreground` | karty | TODO |
| `--primary`, `--primary-foreground` | główne akcje | TODO |
| `--secondary`, `--accent` | akcje drugorzędne, wyróżnienia | TODO |
| `--muted`, `--muted-foreground` | tła pomocnicze, tekst drugorzędny | TODO |
| `--destructive` | akcje nieodwracalne, błędy | TODO |
| `--border`, `--input`, `--ring` | obramowania, pola, focus | TODO |
| `--radius` | promień bazowy | TODO |
| `--success`, `--warning`, `--info` | toasty, alerty, statusy | TODO |

## Statusy rezerwacji

Stałe kolory w całej aplikacji (z kontekstu bazowego Stitch). Etykiety: [glossary.md](../../../docs/product/glossary.md#rezerwacje-statusy-źródła-akcje).

| Status | Etykieta | Kolor | Kalendarz (O3) |
|-|-|-|-|
| `PENDING` | Oczekuje | bursztynowy (amber) | pasek bursztynowy w paski |
| `CONFIRMED` | Potwierdzona | zielony | pasek zielony |
| `CANCELLED` | Anulowana | czerwono-szary | nie pokazujemy |
| `EXPIRED` | Wygasła | szary | nie pokazujemy |
| `COMPLETED` | Zakończona | niebiesko-szary | pasek niebiesko-szary |
| blokada | Blokada – {powód} | szary kreskowany | pasek szary kreskowany |

Komponent: `StatusBadge` (`shared/ui`). Kolor nie jest jedynym nośnikiem informacji, bo badge zawsze ma tekst.

## Typografia (do uzupełnienia)

| Rola | Rozmiar / waga | Uwagi |
|-|-|-|
| body | min. 16 px | grupa docelowa 40–65 lat: duży, czytelny tekst |
| h1 / h2 / h3 | TODO | |
| etykiety pól | TODO | zawsze widoczne (nie tylko placeholder) |
| dane w tabelach | min. 14 px | |

## Odstępy i układ

- Skala Tailwind (4 px). Kontener panelu maks. 1440 px; strona publiczna maks. 1200 px.
- Breakpointy Tailwind: `sm` 640, `md` 768, `lg` 1024, `xl` 1280.
- Cele dotykowe ≥ 44 × 44 px, a główny przycisk akcji zawsze wyraźnie wyróżniony.

## Komponenty bazowe (shadcn/ui)

`Button` (primary, secondary, outline, destructive, ghost), `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `Label`, `Form`, `Dialog`, `Sheet` (drawer rezerwacji), `Tabs`, `Table`, `Badge`, `Card`, `DropdownMenu`, `Popover`, `Calendar` (z `date-fns/locale/pl`, `weekStartsOn: 1`), `Command` (autocomplete gościa), `Tooltip`, `Alert`, `Skeleton`, `Sonner` (toasty), `Pagination`.

Własne: `StatusBadge`, `DataTable`, `EmptyState`, `ErrorState`, `PageSkeleton`, `DateRangePicker`, `MoneyInput`, `ConfirmDialog`, `PhotoUploader`, `OccupancyCalendar` (O3).

## Stany (wzorzec S1)

Arkusz stanów S1 ([screens.md](screens.md)) definiuje wygląd: skeletonów tabeli i kart, stanu pustego z ilustracją, stanu błędu „Coś poszło nie tak. Spróbuj ponownie”, strony 404, toastów (sukces, błąd, ostrzeżenie), przycisków i pól (normal, focus, error, disabled).

## Formatowanie (wspólne, `shared/lib`)

| Dane | Format | Przykład |
|-|-|-|
| Kwota | `Intl.NumberFormat('pl-PL', { style: 'currency', currency, maximumFractionDigits: 0 })` dla pełnych złotych | „1 640 zł” |
| Data | `dd.MM.yyyy` | „14.08.2026” |
| Zakres pobytu | „14.08 – 18.08.2026 (4 noce)” | odmiana „noc/noce/nocy” |
| Godzina | `HH:mm` | „15:00” |
