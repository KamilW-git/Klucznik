# Design system

> Tokeny kolorów, typografia, promienie, cienie, komponenty, statusy i zasady dostępności. Czytaj przed każdym nowym widokiem i komponentem.
> Implementacja: Tailwind CSS 4 (tokeny jako CSS variables w [`src/app/styles.css`](../src/app/styles.css), mapowane na klasy przez `@theme inline`) + komponenty w stylu shadcn/ui (Radix) w `src/shared/ui`. Wzorce wizualne: [design/stitch/](../../../design/README.md), mapa ekranów: [screens.md](screens.md).

## Status

| Element | Status |
|-|-|
| Wariant stylu | ✔ wariant A „Leśna przystań” / „Warm Cabin Hospitality” dla całej aplikacji (strona publiczna, panel, admin), M10 |
| Tokeny kolorów, statusów, promieni, cieni | ✔ M10 |
| Typografia | ✔ M10 (DM Sans) |
| Komponenty bazowe | ✔ częściowo M10 (lista niżej), pozostałe dochodzą w M11–M13 wraz z widokami |
| Stany S1 | ✔ M10: skeleton, pusty, błąd, 404, toasty, przyciski, pola |

## Źródła i rozbieżności w Stitch

Wartości pochodzą z [style.md](../../../design/stitch/style.md) (opis stylu użyty w promptach) i z opisu w `design/stitch/shared/DESIGN.md` (sekcje „Core Swatches”, „Booking Status System”, „Components”), a układ i hierarchia z ekranów PNG.

Eksporty HTML ze Stitch są **niespójne**: strona publiczna (`public/01-property-page.html`) używa kolorów z `style.md`, a ekrany panelu i arkusz komponentów mają paletę wygenerowaną automatycznie przez Stitch (Material: zielonkawe tło `#F0FDF3`, primary `#154539`, akcent `#924B23`). **Obowiązują kolory z `style.md`** (decyzja w M10, [Q-28](../../../docs/open-questions.md#q-28)). Wartości z eksportów HTML nie są źródłem tokenów.

## Kolory

Komponenty używają wyłącznie klas tokenów (`bg-primary`, `text-muted-foreground`, `border-input`…), nigdy surowych kolorów (`#2F5D50`, `bg-green-700`). Kontrast liczony według WCAG 2.1.

### Powierzchnie i tekst

| Token | Wartość | Zastosowanie | Kontrast |
|-|-|-|-|
| `background` | `#FAF7F2` | tło strony (ciepła biel, „pergamin”) | – |
| `foreground` | `#1F2A24` | tekst podstawowy (ciemny mech zamiast czerni) | 13,9 : 1 na `background` |
| `card`, `popover` | `#FFFFFF` | karty, tabele, dialogi, menu (poziom 1 nad tłem) | – |
| `muted` | `#F3EFE8` | tła pomocnicze, wiersze nieaktywne | – |
| `muted-foreground` | `#5C6560` | tekst drugorzędny, opisy, placeholdery | 5,6 : 1 na `background`, 6,0 : 1 na `card` |
| `border` | `#E5E1DA` | ramki kart, separatory (dekoracyjne) | – |
| `input` | `#8A918C` | ramka pól formularza | 3,2 : 1 na `card` (WCAG 1.4.11) |
| `ring` | `#2F5D50` | obrys fokusu | 7,5 : 1 |
| `sand` | `#E8D8C8` | piaskowy akcent tła (hover przycisku `secondary`, dekoracje) | – |

### Akcje

| Token | Wartość | Zastosowanie | Kontrast tekstu |
|-|-|-|-|
| `primary` / `primary-hover` | `#2F5D50` / `#254B40` | główne akcje, aktywna pozycja menu, linki | biały: 7,5 : 1 |
| `accent` / `accent-foreground` | `#E9F1EC` / `#2F5D50` | hover w menu i przyciskach `ghost`, tło ikon stanów | 6,5 : 1 |
| `secondary` | `#F1ECE4` | przycisk drugorzędny wypełniony | – |
| `highlight` | `#C8754A` | terakota: **tylko dekoracja i duże elementy** (kropki, ikony, „0” w 404) | biały: 3,4 : 1 ✗ dla tekstu |
| `highlight-strong` / `-hover` | `#A9592C` / `#924B23` | tło przycisku konwersji (`accent`: „Zarezerwuj”, „Sprawdź dostępność”) | biały: 5,1 : 1 |
| `destructive` / `-hover` | `#BA1A1A` / `#93000A` | akcje nieodwracalne, błędy pól | biały: 6,5 : 1 |

### Komunikaty

| Token | Tekst / tło | Zastosowanie |
|-|-|-|
| `destructive` / `destructive-soft` | `#BA1A1A` / `#FDECEA` | alert błędu, `ErrorState` |
| `warning` / `warning-soft` | `#92400E` / `#FEF3C7` | ostrzeżenia (`RATE_LIMITED`, `VERSION_CONFLICT`) |
| `success` / `success-soft` | `#215844` / `#E6F3EE` | potwierdzenia |
| `info` / `info-soft` | `#1E4E79` / `#E6EFF7` | informacje („Sesja wygasła”) |

## Statusy rezerwacji

Stałe kolory w całej aplikacji (z `DESIGN.md` Stitch). Etykiety: [glossary.md](../../../docs/product/glossary.md#rezerwacje-statusy-źródła-akcje), w kodzie `RESERVATION_STATUS_LABELS` (`shared/lib/reservation-status.ts`). Komponent: `StatusBadge` (pigułka, kropka + tekst; kolor nigdy nie jest jedynym nośnikiem informacji).

| Status | Etykieta | Tło / tekst (token `status-*`) | Kontrast | Kalendarz (O3) |
|-|-|-|-|-|
| `PENDING` | Oczekuje | `#FEF3C7` / `#92400E` | 6,4 : 1 | pasek bursztynowy w paski |
| `CONFIRMED` | Potwierdzona | `#E6F3EE` / `#215844` | 7,2 : 1 | pasek zielony |
| `CANCELLED` | Anulowana | `#FEE2E2` / `#991B1B` | 6,8 : 1 | nie pokazujemy |
| `EXPIRED` | Wygasła | `#F3F4F6` / `#4B5563` | 6,9 : 1 | nie pokazujemy |
| `COMPLETED` | Zakończona | `#E2E8F0` / `#475569` | 6,2 : 1 | pasek niebiesko-szary |
| blokada | Blokada – {powód} | `muted` + szare kreskowanie | – | pasek szary kreskowany |

`EXPIRED` ma ciemniejszy tekst niż w Stitch (`#6B7280` miał 4,4 : 1, poniżej AA).

## Typografia

Font **DM Sans** (zmienny, `@fontsource-variable/dm-sans`, hostowany z aplikacją, bez zapytań do Google Fonts), fallback `system-ui`. Pełny zestaw polskich znaków.

| Rola | Klasa | Rozmiar / interlinia / waga | Uwagi |
|-|-|-|-|
| display | `text-display` | 48 / 56 / 700, `-0.02em` | hero strony publicznej (mobile 34 / 42) |
| h1 strony | `text-headline` | 32 / 40 / 700, `-0.01em` | tytuł widoku (mobile 26 / 32) |
| h2 sekcji | `text-title-lg` | 24 / 32 / 600 | |
| h3, tytuł karty | `text-title` | 20 / 28 / 600 | |
| tytuł małej karty | `text-title-sm` | 18 / 24 / 600 | nazwy pokoi, stany puste |
| body | `text-base` | 16 / 24 / 400 | **minimum dla treści** (grupa 40–65 lat) |
| etykiety pól | `text-base` `font-medium` | 16 / 24 / 500 | zawsze widoczne nad polem (nie tylko placeholder) |
| dane w tabelach, opisy | `text-sm` | 14 / 20 / 400 | minimum dla danych |
| badge, podpisy | `text-xs` | 12 / 16 / 600 | tylko krótkie etykiety |
| overline | `text-overline uppercase` | 11 / 14 / 600, `0.04em` | podpis pod logo, nagłówki sekcji kart |

- Liczby w cenach, datach i tabelach: klasa `tabular` (`font-variant-numeric: tabular-nums`).
- Wagi: 400 opisy, 500 kontrolki, 600 nagłówki i daty, 700 tylko tytuły stron i kluczowe metryki.

## Promienie, cienie, odstępy

| Token | Wartość | Zastosowanie |
|-|-|-|
| `rounded-sm` | 8 px | drobne elementy, obrazki w kartach |
| `rounded-md` (`--radius`) | 12 px | przyciski, pola, pozycje menu |
| `rounded-lg` | 16 px | karty, alerty, panele, popovery |
| `rounded-xl` | 24 px | dialogi, hero, galerie |
| `rounded-full` | pigułka | statusy, chipy filtrów, awatary |
| `shadow-raised` | `0 4px 16px -2px rgb(47 93 80 / .06), 0 2px 6px -1px rgb(31 42 36 / .04)` | poziom 2: hover karty |
| `shadow-overlay` | `0 12px 32px -4px rgb(31 42 36 / .12), 0 4px 12px -2px rgb(47 93 80 / .08)` | poziom 3: dialogi, menu, toasty, panel boczny |
| nakładka dialogu | `bg-foreground/40` + `backdrop-blur-sm` | przyciemnienie pod dialogiem |

Poziom 1 (karty) nie ma cienia: wyróżnia go biel `card` i ramka `border` na tle `background`.

- Skala odstępów Tailwind (4 px). Karty: padding 20 px (`p-5`). Odstęp między sekcjami strony: 24–40 px.
- Kontener: panel maks. 1440 px (`max-w-[90rem]`), strona publiczna maks. 1200 px (`max-w-[75rem]`), formularz logowania 544 px.
- Marginesy boczne: 16 px (mobile), 24 px (tablet), 40 px (desktop).
- Breakpointy Tailwind: `sm` 640, `md` 768, `lg` 1024 (od tego progu sidebar panelu), `xl` 1280.

## Ikony

`lucide-react` (cienkie ikony konturowe, zgodne z opisem stylu „simple outline icons”). Ekrany Stitch używają Material Symbols; zamieniamy je na najbliższe odpowiedniki Lucide. Rozmiar 20 px w przyciskach i menu, 16 px w małych przyciskach i komunikatach pól, 28 px w stanach pustych. Ikony dekoracyjne mają `aria-hidden="true"`, a przycisk z samą ikoną ma `aria-label`.

## Komponenty

### Zrealizowane (M10)

| Komponent | Plik (`src/shared/ui`) | Uwagi |
|-|-|-|
| `Button` | `button.tsx`, `button-variants.ts` | warianty niżej; `loading` (spinner + blokada), `asChild` dla linków |
| `Input`, `InputGroup` | `input.tsx` | wysokość 48 px; ikona z lewej, akcja z prawej (np. pokaż hasło) |
| `Label`, `FormField` | `label.tsx`, `form-field.tsx` | etykieta, `*` dla wymaganych, błąd pod polem z ikoną; `id` i `aria-*` trafiają do `Input` przez kontekst |
| `Alert` | `alert.tsx` | `error` / `warning` (`role="alert"`), `success` / `info` (`role="status"`); opcjonalna akcja i zamknięcie |
| `Card` (+ `Header`, `Title`, `Description`, `Content`) | `card.tsx` | poziom 1 |
| `Skeleton` | `skeleton.tsx` | animacja `shimmer` w tonie `primary/10` |
| `StatusBadge` | `status-badge.tsx` | statusy rezerwacji |
| `EmptyState`, `ErrorState`, `PageSkeleton` | `states.tsx` | stany widoku (S1) |
| `DropdownMenu` | `dropdown-menu.tsx` | Radix; pozycje 44 px, wariant `destructive` |
| `Sheet` | `sheet.tsx` | Radix Dialog jako panel boczny: menu mobilne, w M11 drawer rezerwacji |
| `Toaster` | `toaster.tsx` | sonner; toasty wywołuje `notifySuccess` / `notifyError` z `shared/lib/notify.ts` |
| `Logo` | `logo.tsx` | znak Klucznika (platforma); strona publiczna pokazuje markę obiektu |

### Do zrealizowania z widokami (M11–M13)

`Textarea`, `Select`, `Checkbox`, `Switch`, `Dialog`, `ConfirmDialog`, `Tabs`, `Table` / `DataTable` (sortowanie, paginacja z `meta`, skeleton, stan pusty), `Popover`, `Calendar` i `DateRangePicker` (`date-fns/locale/pl`, `weekStartsOn: 1`), `Command` (autocomplete gościa), `Tooltip`, `Pagination`, `MoneyInput`, `PhotoUploader`, `OccupancyCalendar` (O3), licznik gości (stepper z okrągłymi przyciskami 44 px). Każdy nowy komponent: tokeny z tej strony, Radix dla zachowań dostępności, cele dotykowe ≥ 44 px.

### Przyciski

| Wariant | Wygląd | Kiedy |
|-|-|-|
| `primary` (domyślny) | `primary`, biały tekst | główna akcja widoku („Zaloguj się”, „Potwierdź rezerwację”, „Zapisz”) |
| `accent` | `highlight-strong` (terakota) | konwersja na stronie publicznej („Sprawdź dostępność”, „Zarezerwuj”); w panelu nie używamy |
| `outline` | biały, ramka `primary/25` | akcje drugorzędne („Odrzuć”, „Wyczyść filtry”) |
| `secondary` | `secondary` | akcje pomocnicze w paskach narzędzi |
| `ghost` | sam tekst / ikona | nawigacja dat, zamykanie, akcje w tabelach |
| `destructive` | `destructive` | potwierdzenie nieodwracalnej akcji w dialogu |
| `destructive-outline` | ramka i tekst `destructive` | wywołanie akcji nieodwracalnej („Anuluj rezerwację”) |
| `link` | podkreślony tekst | akcje w treści |

Rozmiary: `sm` 36 px (tylko gęste paski narzędzi), `md` 44 px (domyślny), `lg` 48 px (52 px na telefonie; formularze i strona publiczna), `icon` 44 × 44 px. Stany: hover (ciemniejsze tło), aktywny (`scale(0.98)`), fokus (obrys `ring` 2 px z odstępem 2 px), wyłączony (`opacity-50`), ładowanie (spinner, `aria-busy`).

### Pola formularzy

- Wysokość 48 px, promień 12 px, tło `card`, ramka `input` (1 px).
- Fokus: ramka `primary` 2 px + pierścień `primary/15` 4 px.
- Błąd: ramka `destructive` (`aria-invalid`), komunikat pod polem w kolorze `destructive` z ikoną, powiązany przez `aria-describedby`.
- Wyłączone: tło `muted`, `opacity-70`.
- Wzorzec użycia:

```tsx
<FormField label="Adres e-mail" required error={errors.email?.message}>
  <InputGroup startIcon={<Mail />}>
    <Input type="email" autoComplete="username" {...register('email')} />
  </InputGroup>
</FormField>
```

## Stany (wzorzec S1)

Arkusz `design/stitch/shared/components.png` (sekcje 01–07).

| Stan | Komponent | Wygląd |
|-|-|-|
| ładowanie | `PageSkeleton`, `Skeleton` | szkielet układu (wiersze tabeli: awatar, 2 linie, pigułka statusu), `role="status"` „Ładowanie…” |
| pusty | `EmptyState` | biała karta, ikona w kółku `accent`, tytuł, opis, akcje („Dodaj rezerwację”, „Wyczyść filtry”) |
| błąd | `ErrorState` | karta z górnym paskiem `destructive`, komunikat z mapy `code`, `requestId` dla 5xx, „Spróbuj ponownie” |
| 404 | `NotFoundPage` (`app/pages`) | „404” (środkowe „0” w terakocie), „Nie znaleziono strony”, motyw drzew, przycisk do panelu lub logowania |
| toasty | `Toaster` + `notifySuccess` / `notifyError` | biała karta z ramką w kolorze rodzaju, ikona, tytuł i opis; prawy dół (desktop), góra (telefon) |
| widok w przygotowaniu | `ComingSoonPage` (`app/pages`) | `EmptyState` dla tras z kolejnych etapów |

## Układ obszarów

| Obszar | Layout | Wygląd |
|-|-|-|
| Logowanie (O1) | `AuthLayout` | z lewej panel marki (gradient `primary`, hasło, 3 karty korzyści), z prawej formularz; na telefonie tylko formularz z logo |
| Panel Gospodarza, admin | `PanelLayout` (`OwnerLayout`, `AdminLayout`) | sidebar 288 px (biały, aktywna pozycja: tło `primary`, biały tekst), górny pasek z menu użytkownika; poniżej 1024 px menu w panelu bocznym (`Sheet`) |
| Strona publiczna | `PublicLayout` | marka obiektu w nagłówku (M12), treść maks. 1200 px, stopka „Rezerwacje obsługuje Klucznik” |

## Dostępność

- Kontrast AA dla tekstu (≥ 4,5 : 1) i elementów interfejsu (≥ 3 : 1); wartości w tabelach wyżej. Terakota `highlight` nie służy do tekstu na białym.
- Fokus widoczny zawsze (`:focus-visible`, obrys `ring`).
- Cele dotykowe ≥ 44 × 44 px (przyciski `md`, `icon`, pozycje menu, linki nawigacji 48 px).
- Każde pole ma etykietę; błędy powiązane z polem; alerty błędów mają `role="alert"`.
- `prefers-reduced-motion` wyłącza animacje i przejścia.
- Reguły ESLint `jsx-a11y` (recommended) w `apps/web`.

## Formatowanie (wspólne, `shared/lib`)

| Dane | Funkcja | Przykład |
|-|-|-|
| Kwota (grosze z API) | `formatMoney(minor, currency?)` | „1 640 zł”, z groszami „1 640,50 zł” |
| Złote ↔ grosze (formularze) | `toMinor`, `fromMinor` | `toMinor(19.99) = 1999` |
| Data | `formatDate` | „14.08.2026” |
| Data i godzina | `formatDateTime` | „03.08.2026, 10:00” |
| Data długa | `formatLongDate` | „poniedziałek, 16 czerwca 2025” |
| Godzina | `formatTime` | „15:00” |
| Liczba nocy | `formatNights`, `nightsBetween` | „1 noc”, „4 noce”, „5 nocy” |
| Zakres pobytu | `formatStayRange` | „14.08 – 18.08.2026 (4 noce)” |
| Status rezerwacji | `RESERVATION_STATUS_LABELS` | „Oczekuje” |
| Błąd API | `getErrorMessage` (`api-errors.ts`) | „Ten termin koliduje z inną rezerwacją lub blokadą.” |

## Odstępstwa od ekranów Stitch

Specyfikacja funkcjonalności wygrywa z ekranem ([design/README.md](../../../design/README.md)). Pominięte elementy spoza zakresu MVP: [Q-28](../../../docs/open-questions.md#q-28).
