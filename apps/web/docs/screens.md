# Mapa ekranów

> Ekran → route → funkcjonalność → plik w `design/stitch` → status. Czytaj na starcie każdej sesji `UI`, żeby znaleźć wzorzec wizualny i specyfikację.
> Konwencja plików: [design/README.md](../../../design/README.md). Prompty, z których powstały ekrany: [02-prompty-stitch.md](../../../docs/prompts/02-prompty-stitch.md).

Statusy: `brak projektu` (ekran ze Stitch nie dostarczony), `projekt` (jest plik), `w toku`, `gotowe`.

## Strona publiczna (gość), mobile-first

| ID | Ekran | Route | Funkcjonalność | Plik Stitch | Etap | Status |
|-|-|-|-|-|-|-|
| P1 | Strona obiektu | `/o/:slug` | [guest-booking.md](../../../docs/features/guest-booking.md), [photos.md](../../../docs/features/photos.md) | `public/01-property-page.png`, `-mobile.png` | M12 | projekt |
| P2 | Wyniki dostępności | `/o/:slug/dostepnosc` | [guest-booking.md](../../../docs/features/guest-booking.md) | `public/02-availability.png` | M12 | projekt |
| P3 | Formularz rezerwacji | `/o/:slug/rezerwacja` | [guest-booking.md](../../../docs/features/guest-booking.md) | `public/03-booking-form.png` | M12 | projekt |
| P4 | Potwierdzenie wysłania | `/o/:slug/rezerwacja/wyslana` | [guest-booking.md](../../../docs/features/guest-booking.md) | `public/04-booking-confirmation.png` (wariant: `04-booking-corfimation.png`) | M12 | projekt |
| P5 | Zarządzanie rezerwacją (token) | `/r/:token` | [guest-booking.md](../../../docs/features/guest-booking.md) | brak: `public/05-quest-reservation.png` to kopia P4 ([Q-28](../../../docs/open-questions.md#q-28)) | M12 | brak projektu |

## Panel Gospodarza, desktop-first

| ID | Ekran | Route | Funkcjonalność | Plik Stitch | Etap | Status |
|-|-|-|-|-|-|-|
| O1 | Logowanie | `/logowanie` | [auth.md](../../../docs/features/auth.md) | `owner/01-login.png` | M10 | gotowe |
| O2 | Pulpit | `/panel` | [properties.md](../../../docs/features/properties.md), [reservations.md](../../../docs/features/reservations.md) | `owner/02-dashboard.png` | M11 | gotowe |
| O3 | Kalendarz obłożenia | `/panel/kalendarz` | [availability.md](../../../docs/features/availability.md) | `owner/03-calendar.png` | M11 | gotowe |
| O4 | Rezerwacje: lista i szczegóły | `/panel/rezerwacje`, `/panel/rezerwacje/:id` | [reservations.md](../../../docs/features/reservations.md) | `owner/04-reservations.png` | M11 | gotowe |
| O5 | Nowa rezerwacja ręczna (dialog) | dialog z O2, O3, O4 | [reservations.md](../../../docs/features/reservations.md), [guests.md](../../../docs/features/guests.md), [availability.md](../../../docs/features/availability.md) | `owner/05-manual-reservation.png` | M11 | gotowe |
| O6 | Lista pokoi | `/panel/pokoje` | [rooms.md](../../../docs/features/rooms.md) | `owner/06-rooms.png` | M11 | gotowe |
| O7 | Edycja pokoju (informacje, zdjęcia, cennik, blokady) | `/panel/pokoje/:roomId/:tab`, `/panel/pokoje/nowy` | [rooms.md](../../../docs/features/rooms.md), [photos.md](../../../docs/features/photos.md), [pricing.md](../../../docs/features/pricing.md), [availability.md](../../../docs/features/availability.md) | `owner/07-room-edit-photos.png` (brak `07-room-edit.png`: pozostałe zakładki według wzorca zdjęć) | M11 | gotowe |
| O8 | Ustawienia obiektu | `/panel/ustawienia` | [properties.md](../../../docs/features/properties.md), [photos.md](../../../docs/features/photos.md) | `owner/08-property-settings.png` | M11 | gotowe |
| – | Goście | `/panel/goscie` | [guests.md](../../../docs/features/guests.md) | brak: wzorzec tabeli z O4 | M11 | gotowe (bez projektu) |

## Administrator

| ID | Ekran | Route | Funkcjonalność | Plik Stitch | Etap | Status |
|-|-|-|-|-|-|-|
| A1 | Właściciele | `/admin/wlasciciele` | [admin-owners.md](../../../docs/features/admin-owners.md) | `admin/01-owners.png` | M13 | projekt |
| – | Obiekty | `/admin/obiekty` | [admin-owners.md](../../../docs/features/admin-owners.md) | brak: wzorzec tabeli z A1 | M13 | brak projektu |
| – | Logi e-maili | `/admin/logi-email` | [admin-owners.md](../../../docs/features/admin-owners.md), [notifications.md](../../../docs/features/notifications.md) | brak: wzorzec tabeli z A1 | M13 | brak projektu |

## Wspólne i opcjonalne

| ID | Ekran | Gdzie używany | Plik Stitch | Etap | Status |
|-|-|-|-|-|-|
| S1 | Arkusz stanów i komponentów | [design-system.md](design-system.md#stany-wzorzec-s1), wszystkie widoki | `shared/components.png` | M10 | gotowe |
| E1 | E-mail potwierdzenia rezerwacji | szablony e-maili (sesja `API`, [notifications.md](../../../docs/features/notifications.md)) | `emails/reservation-confirmed.png` | M9 | gotowe (szablony API) |
| – | 404 „Nie znaleziono strony” | wszystkie obszary | w S1 (sekcja 03) | M10 | gotowe |

Nazwy części plików w `design/stitch/` odbiegają od [konwencji](../../../design/README.md#konwencja-nazw) (literówki, `shared/components.*`, folder `emails/`). Tabela podaje faktyczne nazwy; elementy ekranów spoza specyfikacji pomijamy ([Q-28](../../../docs/open-questions.md#q-28)).

## Zasady

- Ekran ze Stitch to **wzorzec** układu, kolorów, typografii i hierarchii, a nie kod do skopiowania ([design/README.md](../../../design/README.md)).
- Brak pliku Stitch nie blokuje pracy: użyj komponentów design systemu i układu najbliższego ekranu, a w kolumnie „Status” wpisz `w toku (bez projektu)`.
- Nowy ekran najpierw trafia do tej tabeli, potem do kodu.
