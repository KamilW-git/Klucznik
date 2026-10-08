# Wizja produktu

> Opisuje problem, użytkowników, propozycję wartości i zakres MVP. Czytaj, żeby zrozumieć, *po co* powstaje dana funkcja.
> Nazewnictwo pojęć: [glossary.md](glossary.md).

## Problem

Właściciele małych obiektów noclegowych (pensjonaty, domki letniskowe, pokoje gościnne, agroturystyki) przyjmują rezerwacje przez telefon, e-mail i portale pośredników. Portale pobierają prowizję, a ręczne prowadzenie kalendarza prowadzi do pomyłek i podwójnych rezerwacji. Właściciele to często osoby w wieku 40–65 lat, które nie czują się pewnie z technologią.

## Rozwiązanie

**Klucznik – Twój e-recepcjonista.** Jedna aplikacja, w której:

- gość rezerwuje **bezpośrednio na stronie obiektu**, bez prowizji pośrednika. Strona jest white-label: marka obiektu, a Klucznik tylko w stopce („Rezerwacje obsługuje Klucznik”),
- system pilnuje dostępności, liczy cenę według cennika sezonowego i wysyła e-maile,
- właściciel w **Panelu Gospodarza** widzi kalendarz obłożenia, potwierdza rezerwacje i dodaje rezerwacje telefoniczne,
- niepotwierdzone rezerwacje wygasają same, a zakończone pobyty zamykają się automatycznie.

## Aktorzy

| Aktor | Opis | Uprawnienia |
|-|-|-|
| Gość | niezalogowany | przegląda stronę obiektu, sprawdza dostępność, tworzy rezerwację; przez link z e-maila podgląda i anuluje swoją rezerwację |
| Właściciel (`OWNER`) | zalogowany | zarządza **wyłącznie swoimi** obiektami, pokojami, zdjęciami, cenami, blokadami, gośćmi i rezerwacjami; dodaje rezerwacje ręczne |
| Administrator (`ADMIN`) | zalogowany | pełny dostęp do wszystkich zasobów; zakłada i blokuje konta właścicieli |

## Model biznesowy

- Jedna instancja aplikacji obsługuje wielu właścicieli (multi-tenant): [ADR 0008](../decisions/0008-multi-tenancy-ownership.md).
- Model „full service”: konta właścicieli zakłada administrator. Samodzielna rejestracja pojawi się później.
- Docelowo abonament dla właściciela, bez prowizji od rezerwacji.

## Propozycja wartości

| Dla kogo | Wartość |
|-|-|
| Właściciel | brak prowizji, jeden kalendarz bez podwójnych rezerwacji, automatyczne e-maile, prosty panel |
| Gość | szybka rezerwacja bez zakładania konta, jasna cena i polityka anulowania, samodzielne anulowanie z linku |
| Platforma | jedna instancja dla wielu klientów, niski koszt obsługi |

## Zakres MVP (wersja na zaliczenie)

| Obszar | Dokument funkcjonalności |
|-|-|
| Auth i role | [auth.md](../features/auth.md) |
| Zarządzanie właścicielami (admin) | [admin-owners.md](../features/admin-owners.md) |
| Obiekty | [properties.md](../features/properties.md) |
| Pokoje | [rooms.md](../features/rooms.md) |
| Zdjęcia (upload) | [photos.md](../features/photos.md) |
| Ceny bazowe i sezonowe | [pricing.md](../features/pricing.md) |
| Blokady, dostępność, kalendarz | [availability.md](../features/availability.md) |
| Rezerwacje w panelu, maszyna stanów, rezerwacja ręczna | [reservations.md](../features/reservations.md) |
| Publiczny proces rezerwacji i token gościa | [guest-booking.md](../features/guest-booking.md) |
| Goście | [guests.md](../features/guests.md) |
| E-maile i scheduler | [notifications.md](../features/notifications.md) |

Frontend obejmuje trzy obszary: stronę publiczną (`/o/:slug`), Panel Gospodarza (`/panel`) i panel admina (`/admin`): [screens.md](../../apps/web/docs/screens.md).

## Później (poza MVP)

Projektujemy tak, żeby te funkcje dało się dodać bez przebudowy. Kolejność odpowiada priorytetowi komercyjnemu.

1. Synchronizacja kalendarzy iCal z Booking/Airbnb (najważniejsza funkcja komercyjna).
2. Płatności online i zadatki.
3. Samodzielna rejestracja właścicieli i plany abonamentowe.
4. Wielu pracowników jednego obiektu.
5. Edytor wyglądu strony obiektu.
6. Osobna aplikacja SSR (Next.js, `apps/site`) dla stron obiektów pod SEO.
7. Wielojęzyczność.
8. Opinie gości.
9. Reset hasła przez e-mail ([Q-06](../open-questions.md#q-06)).

Jak architektura przygotowuje się na te funkcje: [overview.md](../architecture/overview.md#gotowość-na-rozszerzenia).
