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
- **Lazy loading per obszar:** właściwość `lazy` trasy (`lazy: async () => ({ Component: (await import('…')).Page })`) dla layoutów obszarów i stron, dzięki czemu gość nie pobiera kodu panelu.
- Ścieżki w UI są po polsku i definiowane wyłącznie w `app/routes.ts`: wzorce dla routera (`paths.panel.reservation` = `/panel/rezerwacje/:id`) i funkcje dla komponentów (`routes.panel.reservations()`, `routes.public.property(slug)`). Nie wpisujemy stringów ścieżek w komponentach.
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
| `RequireAuth` | czeka na `auth.status !== 'loading'` (bootstrap refresh); `anonymous` → `/logowanie?next=<ścieżka>` (bez `next` po świadomym wylogowaniu) |
| `RequireRole roles={['OWNER','ADMIN']}` | zła rola → przekierowanie do panelu właściwego dla roli (`ADMIN` → `/admin/wlasciciele`, `OWNER` → `/panel`; `homeFor(role)` w `app/routes.ts`) |
| `RedirectIfAuthenticated` | na `/logowanie` przekierowuje zalogowanych: do `?next=` (tylko ścieżka wewnętrzna, `safeNext`) albo do panelu roli. To ono przekierowuje po udanym logowaniu |
| `RootRedirect` | `/` → panel roli albo `/logowanie` |

Ochrona tras w UI służy wygodzie użytkownika. Faktyczną autoryzację wymusza API (403/404).

Trasy z kolejnych etapów mają do czasu realizacji zaślepkę `ComingSoonPage` („Ten widok jest w przygotowaniu”). Nieobsłużony błąd renderowania albo nieudane pobranie kodu obszaru (np. po wdrożeniu nowej wersji) pokazuje `RouteErrorPage` z przeładowaniem strony, a w trakcie ładowania kodu obszaru widać `FullPageLoader`.

## Kontekst obiektu w panelu

- `CurrentPropertyProvider` (`features/current-property`, montowany w `OwnerLayout`): lista obiektów z `GET /properties`, wybrany obiekt zapamiętany w `localStorage` (`kl.currentPropertyId`); domyślnie pierwszy. `PropertySwitcher` w sidebarze (przy jednym obiekcie tylko etykieta).
- `CurrentPropertyGate` renderuje widoki panelu dopiero po wyborze obiektu (szkielet, błąd z ponowieniem albo stan pusty), więc widoki używają `useCurrentProperty()` bez sprawdzania `null`.
- Klucze zapytań zawierają `propertyId`, więc po zmianie obiektu widoki same pobierają dane nowego obiektu (bez ręcznego unieważniania).
- Właściciel bez obiektu widzi stan pusty „Nie masz jeszcze obiektu” z informacją o kontakcie z administratorem.
- `ADMIN` w `/panel` może wybrać dowolny obiekt (podgląd panelu klienta).

## Feature folders

```
features/reservations/
  components/   ReservationFilters, ReservationDrawer, CancelReservationDialog, EditReservationDialog,
                ManualReservationDialog (O5), StayQuoteSummary
  hooks/        useReservationFilters (URL ↔ query), useConfirmReservation, useCancelReservation
  pages/        ReservationsPage
  labels.ts     etykiety źródeł, zdarzeń historii, aktorów
  schemas.ts    zod: formularz rezerwacji ręcznej i edycji
  index.ts      publiczny eksport (dialogi i drawer używane na pulpicie i w kalendarzu)
```

Strona publiczna (M12):

```
features/public-property/   PublicPropertyLayout (pobiera obiekt dla /o/:slug/*, 404), PropertyPage (P1),
                            AvailabilityPage (P2), PropertyHeader, StaySearchForm, RoomCard, PhotoGrid,
                            PhotoLightbox, RoomDatesDialog, OccupancyMiniCalendar; stay-search.ts (URL ↔ pobyt),
                            policy.ts (teksty BR-07, BR-08), usePublicProperty (dane z Outlet context)
features/guest-booking/     BookingPage (P3), BookingSentPage (P4, dane ze state routera), BookingSummary,
                            BookingSteps, TermsDialogContent (Q-19), schemas.ts
features/guest-reservation/ GuestReservationPage (P5), GuestCancelDialog
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
| `DateRangePicker` | zakres dat: `stay` (pobyt `[checkIn, checkOut)`, dzień wyjazdu może być pierwszą zajętą nocą kolejnej rezerwacji) albo `nights` (noce włącznie); zajęte noce z `isNightUnavailable`; PL, tydzień od poniedziałku |
| `MoneyInput` | pole w zł ↔ grosze (`null` puste, `NaN` niepoprawne – zgłasza `minorPriceSchema`) |
| `ConfirmDialog`, `Dialog`, `Sheet` | potwierdzenia, formularze w dialogu, drawer szczegółów |
| `SaveBar` | przyklejony pasek „Zapisz zmiany” przy niezapisanych zmianach |
| `lib/money.ts`, `lib/dates.ts` | `formatMoney`, `toMinor`, `fromMinor`, `formatDate`, `nightsBetween` |
| `lib/invalidate.ts` | unieważnianie zapytań po ścieżce API (`invalidateReservations`, `invalidateRooms`, `invalidateAvailability`, `invalidateRates`, `invalidateProperty`) |
| `lib/date-matchers.ts` | zajęte noce pokoju (rezerwacje i blokady) jako predykat dla `DateRangePicker` |
| `lib/file-url.ts` | adres zdjęcia z `PhotoDto.url` z uwzględnieniem `VITE_API_BASE_URL` |
| `lib/public-query.ts` | ustawienia zapytań strony publicznej i `invalidatePublicAvailability` |
| `lib/use-document-meta.ts` | tytuł karty i meta `description`, `robots`, `referrer` (przywracane po wyjściu ze strony) |
| `lib/use-media-query.ts` | dopasowanie media query (np. liczba miesięcy kalendarza na telefonie) |

## Wydajność i jakość

- Strona publiczna: obrazy `loading="lazy"`, rozmiar bundla obszaru publicznego sprawdzany w wyniku `vite build`. W M12 strony P1–P5 to osobne chunki po 8–20 kB (gzip 3–7 kB) poza wspólnym `index` (ok. 370 kB, gzip 117 kB); gość nie pobiera kodu panelu.
- `RootShell` (`app/layouts/root-shell.tsx`) montuje `ScrollRestoration`: nowa strona zaczyna się od góry, a adres z kotwicą (`/o/:slug#pokoje`) przewija do sekcji.
- ESLint z regułami `react-hooks`, `jsx-a11y` i `react-refresh` (plik `.tsx` eksportuje tylko komponenty; stałe, warianty `cva` i hooki kontekstu są w osobnych plikach `.ts`).
- Testy: [testing-strategy.md](../../../docs/architecture/testing-strategy.md#frontend).
