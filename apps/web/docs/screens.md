# Mapa ekranów

> Ekran → route → funkcjonalność → plik w `design/stitch` → status. Czytaj na starcie każdej sesji `UI`, żeby znaleźć wzorzec wizualny i specyfikację.
> Konwencja plików: [design/README.md](../../../design/README.md). Prompty, z których powstały ekrany: [02-prompty-stitch.md](../../../docs/prompts/02-prompty-stitch.md).

Statusy: `brak projektu` (ekran ze Stitch nie dostarczony), `projekt` (jest plik), `w toku`, `gotowe`.

## Strona publiczna (gość), mobile-first

| ID | Ekran | Route | Funkcjonalność | Plik Stitch | Etap | Status |
|-|-|-|-|-|-|-|
| P1 | Strona obiektu | `/o/:slug` | [guest-booking.md](../../../docs/features/guest-booking.md), [photos.md](../../../docs/features/photos.md) | `public/01-property-page.png`, `-mobile.png` | M12 | brak projektu |
| P2 | Wyniki dostępności | `/o/:slug/dostepnosc` | [guest-booking.md](../../../docs/features/guest-booking.md) | `public/02-availability.png` | M12 | brak projektu |
| P3 | Formularz rezerwacji | `/o/:slug/rezerwacja` | [guest-booking.md](../../../docs/features/guest-booking.md) | `public/03-booking-form.png` | M12 | brak projektu |
| P4 | Potwierdzenie wysłania | `/o/:slug/rezerwacja/wyslana` | [guest-booking.md](../../../docs/features/guest-booking.md) | `public/04-booking-sent.png` | M12 | brak projektu |
| P5 | Zarządzanie rezerwacją (token) | `/r/:token` | [guest-booking.md](../../../docs/features/guest-booking.md) | `public/05-guest-reservation.png` | M12 | brak projektu |

## Panel Gospodarza, desktop-first

| ID | Ekran | Route | Funkcjonalność | Plik Stitch | Etap | Status |
|-|-|-|-|-|-|-|
| O1 | Logowanie | `/logowanie` | [auth.md](../../../docs/features/auth.md) | `owner/01-login.png` | M10 | brak projektu |
| O2 | Pulpit | `/panel` | [properties.md](../../../docs/features/properties.md), [reservations.md](../../../docs/features/reservations.md) | `owner/02-dashboard.png` | M11 | brak projektu |
| O3 | Kalendarz obłożenia | `/panel/kalendarz` | [availability.md](../../../docs/features/availability.md) | `owner/03-calendar.png` | M11 | brak projektu |
| O4 | Rezerwacje: lista i szczegóły | `/panel/rezerwacje`, `/panel/rezerwacje/:id` | [reservations.md](../../../docs/features/reservations.md) | `owner/04-reservations.png` | M11 | brak projektu |
| O5 | Nowa rezerwacja ręczna (dialog) | dialog z O2, O3, O4 | [reservations.md](../../../docs/features/reservations.md), [guests.md](../../../docs/features/guests.md), [availability.md](../../../docs/features/availability.md) | `owner/05-manual-reservation.png` | M11 | brak projektu |
| O6 | Lista pokoi | `/panel/pokoje` | [rooms.md](../../../docs/features/rooms.md) | `owner/06-rooms.png` | M11 | brak projektu |
| O7 | Edycja pokoju (informacje, zdjęcia, cennik, blokady) | `/panel/pokoje/:roomId/:tab`, `/panel/pokoje/nowy` | [rooms.md](../../../docs/features/rooms.md), [photos.md](../../../docs/features/photos.md), [pricing.md](../../../docs/features/pricing.md), [availability.md](../../../docs/features/availability.md) | `owner/07-room-edit.png`, `owner/07-room-edit-photos.png` | M11 | brak projektu |
| O8 | Ustawienia obiektu | `/panel/ustawienia` | [properties.md](../../../docs/features/properties.md), [photos.md](../../../docs/features/photos.md) | `owner/08-property-settings.png` | M11 | brak projektu |
| – | Goście | `/panel/goscie` | [guests.md](../../../docs/features/guests.md) | brak: wzorzec tabeli z O4 | M11 | brak projektu |

## Administrator

| ID | Ekran | Route | Funkcjonalność | Plik Stitch | Etap | Status |
|-|-|-|-|-|-|-|
| A1 | Właściciele | `/admin/wlasciciele` | [admin-owners.md](../../../docs/features/admin-owners.md) | `admin/01-owners.png` | M13 | brak projektu |
| – | Obiekty | `/admin/obiekty` | [admin-owners.md](../../../docs/features/admin-owners.md) | brak: wzorzec tabeli z A1 | M13 | brak projektu |
| – | Logi e-maili | `/admin/logi-email` | [admin-owners.md](../../../docs/features/admin-owners.md), [notifications.md](../../../docs/features/notifications.md) | brak: wzorzec tabeli z A1 | M13 | brak projektu |

## Wspólne i opcjonalne

| ID | Ekran | Gdzie używany | Plik Stitch | Etap | Status |
|-|-|-|-|-|-|
| S1 | Arkusz stanów i komponentów | [design-system.md](design-system.md#stany-wzorzec-s1), wszystkie widoki | `shared/01-component-sheet.png` | M10 | brak projektu |
| E1 | E-mail potwierdzenia rezerwacji | szablony e-maili (sesja `API`, [notifications.md](../../../docs/features/notifications.md)) | `email/01-reservation-confirmed.png` | M9 | brak projektu |
| – | 404 „Nie znaleziono strony” | wszystkie obszary | w S1 | M10 | brak projektu |

## Zasady

- Ekran ze Stitch to **wzorzec** układu, kolorów, typografii i hierarchii, a nie kod do skopiowania ([design/README.md](../../../design/README.md)).
- Brak pliku Stitch nie blokuje pracy: użyj komponentów design systemu i układu najbliższego ekranu, a w kolumnie „Status” wpisz `w toku (bez projektu)`.
- Nowy ekran najpierw trafia do tej tabeli, potem do kodu.
