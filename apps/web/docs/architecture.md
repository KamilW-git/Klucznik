# Architektura frontendu

> Routing, layouty, feature folders, ochrona tras i podział kodu. Czytaj w M10 i przy dodawaniu nowych tras.
> Lista ekranów i tras: [screens.md](screens.md). Dane i auth: [data-and-auth.md](data-and-auth.md).

## Obszary aplikacji

| Obszar | Prefiks | Dostęp | Layout | Projekt |
|-|-|-|-|-|
| Strona publiczna obiektu | `/o/:slug`, `/r/:token` | wszyscy | `PublicLayout` (marka obiektu, stopka „Rezerwacje obsługuje Klucznik”) | mobile-first |
| Logowanie | `/logowanie` | niezalogowani | `AuthLayout` (marka Klucznik) | responsywny |
| Panel Gospodarza | `/panel/*` | `OWNER` (i `ADMIN`) | `OwnerLayout` (sidebar, przełącznik obiektu, top bar) | desktop-first, responsywny |
| Panel admina | `/admin/*` | `ADMIN` | `AdminLayout` (sidebar z etykietą „Administrator”) | desktop-first |

`/` przekierowuje do `/logowanie` (zalogowany użytkownik idzie od razu do swojego panelu). Nieznana ścieżka pokazuje stronę 404 „Nie znaleziono strony”.

## Routing

- React Router (data router: `createBrowserRouter`). Definicja w `app/router.tsx`.
- **Lazy loading per obszar:** `lazy(() => import('features/…/pages/…'))`, dzięki czemu gość nie pobiera kodu panelu.
- Ścieżki w UI są po polsku i definiowane wyłącznie w `app/routes.ts` jako stałe (`routes.panel.reservations()`, `routes.public.property(slug)`). Nie wpisujemy stringów ścieżek w komponentach.
- Filtry, paginacja i zakładki są w URL (`useSearchParams`), żeby linki dało się udostępniać i odświeżać.

```
/o/:slug                          P1
/o/:slug/dostepnosc               P2 (?checkIn&checkOut&guests)
/o/:slug/rezerwacja               P3 (?roomId&checkIn&checkOut&guests)
/o/:slug/rezerwacja/wyslana       P4
/r/:token                         P5
/logowanie                        O1
/panel                            O2
/panel/kalendarz                  O3 (?from&view=2w|month)
/panel/rezerwacje                 O4 (?page&status&roomId&from&to&q)
/panel/rezerwacje/:id             O4 (drawer nad listą)
/panel/pokoje                     O6
/panel/pokoje/nowy                O7 (zakładka Informacje)
/panel/pokoje/:roomId/:tab        O7 (tab: informacje | zdjecia | cennik | blokady)
/panel/goscie                     lista gości
/panel/ustawienia                 O8
/admin/wlasciciele                A1
/admin/obiekty                    lista obiektów
/admin/logi-email                 logi e-maili
```

Rezerwacja ręczna (O5) jest dialogiem otwieranym z kalendarza, listy rezerwacji i pulpitu, a nie osobną trasą.

## Ochrona tras

| Komponent | Działanie |
|-|-|
| `RequireAuth` | czeka na `auth.status !== 'loading'` (bootstrap refresh); `anonymous` → `/logowanie?next=<ścieżka>` |
| `RequireRole roles={['OWNER','ADMIN']}` | zła rola → przekierowanie do panelu właściwego dla roli (`ADMIN` → `/admin`, `OWNER` → `/panel`) |
| `RedirectIfAuthenticated` | na `/logowanie` przekierowuje zalogowanych |

Ochrona tras w UI służy wygodzie użytkownika. Faktyczną autoryzację wymusza API (403/404).

## Kontekst obiektu w panelu

- `CurrentPropertyProvider`: lista obiektów z `GET /properties`, wybrany obiekt zapamiętany w `localStorage` (`kl.currentPropertyId`); domyślnie pierwszy.
- Wszystkie widoki panelu używają `useCurrentProperty()`. Zmiana obiektu unieważnia zapytania zależne od obiektu.
- Właściciel bez obiektu widzi stan pusty z informacją o kontakcie z administratorem.
- `ADMIN` w `/panel` może wybrać dowolny obiekt (podgląd panelu klienta).

## Feature folders

```
features/reservations/
  components/   ReservationsTable, ReservationDrawer, CancelReservationDialog, ManualReservationDialog
  hooks/        useReservationFilters (URL ↔ query), useReservationActions
  pages/        ReservationsPage
  schemas.ts    zod: filtry, formularz rezerwacji ręcznej
  index.ts      publiczny eksport (strony, dialogi używane w innych feature'ach)
```

- Feature importuje z innego feature'a tylko przez jego `index.ts`.
- `shared/` nie importuje z `features/`.
- Komponenty prezentacyjne bez wywołań API, a dane dostarczają hooki lub strony.

## Wspólne elementy `shared/`

| Element | Zastosowanie |
|-|-|
| `StatusBadge` | statusy rezerwacji (kolory z [design-system.md](design-system.md#statusy-rezerwacji)) |
| `DataTable` | tabela z sortowaniem, paginacją (`meta`), skeletonem, stanem pustym |
| `EmptyState`, `ErrorState`, `PageSkeleton` | stany widoków |
| `DateRangePicker` | zakres dat (pobyt `[checkIn, checkOut)` albo zakres włączny, zależnie od trybu), PL, tydzień od poniedziałku |
| `MoneyInput` | pole w zł ↔ grosze |
| `ConfirmDialog` | potwierdzenia akcji nieodwracalnych |
| `lib/money.ts`, `lib/dates.ts` | `formatMoney`, `toMinor`, `fromMinor`, `formatDate`, `nightsBetween` |

## Wydajność i jakość

- Strona publiczna: obrazy `loading="lazy"`, rozmiar bundla obszaru publicznego monitorowany (`vite build --report` w M12).
- ESLint z regułami `react-hooks`, `jsx-a11y`.
- Testy: [testing-strategy.md](../../../docs/architecture/testing-strategy.md#frontend).
