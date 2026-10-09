# design/: ekrany ze Stitch

> Konwencja folderów i nazw plików z projektami ekranów wygenerowanymi w Stitch. Czytaj przed dodaniem nowego ekranu i na starcie sesji `UI`.
> Mapa ekran → route → funkcjonalność → status: [apps/web/docs/screens.md](../apps/web/docs/screens.md). Prompty: [docs/prompts/02-prompty-stitch.md](../docs/prompts/02-prompty-stitch.md).

## Struktura

```
design/stitch/
  public/                 strona publiczna (gość)
    01-property-page.png
    01-property-page-mobile.png
    01-property-page.html         (opcjonalnie: kod wyeksportowany ze Stitch)
    02-availability.png
    03-booking-form.png
    04-booking-sent.png
    05-guest-reservation.png
  owner/                  Panel Gospodarza
    01-login.png
    02-dashboard.png
    03-calendar.png
    04-reservations.png
    05-manual-reservation.png
    06-rooms.png
    07-room-edit.png
    07-room-edit-photos.png
    08-property-settings.png
  admin/                  panel admina
    01-owners.png
  shared/                 arkusze wspólne
    01-component-sheet.png
  email/                  projekty e-maili
    01-reservation-confirmed.png
  style-variants/         (opcjonalnie) porównanie wariantów A/B/C przed wyborem
```

## Konwencja nazw

- `<NN>-<nazwa-kebab-case>[-<wariant>].<ext>`, gdzie `NN` to numer ekranu z promptów: P1 → `public/01-…`, O3 → `owner/03-…`, A1 → `admin/01-…`, S1 → `shared/01-…`, E1 → `email/01-…`.
- Warianty: `-mobile` (wersja mobilna), `-error` (stan błędu), `-empty` (stan pusty), `-modal` (dialog), `-<zakładka>` (np. `-photos`).
- Nazwy plików po angielsku, małymi literami, bez spacji i polskich znaków.
- Eksport: PNG w szerokości 1440 px (desktop) lub 390 px (mobile); HTML opcjonalnie, o tej samej nazwie co PNG.

## Jak używać

- Ekrany to **wzorzec wyglądu** (układ, kolory, typografia, hierarchia), a nie kod do kopiowania 1:1. Implementacja używa komponentów design systemu ([design-system.md](../apps/web/docs/design-system.md)).
- Wyeksportowany HTML służy tylko jako podgląd wartości (kolory, odstępy, fonty). Nie wklejamy go do `apps/web`.
- Teksty i przykładowe dane na ekranach („Domki Leśna Polana”, „Anna Kowalska”) odpowiadają danym z seeda ([persistence-layer.md](../apps/api/docs/persistence-layer.md#seed)).
- Gdy ekran ze Stitch jest sprzeczny ze specyfikacją funkcjonalności, wygrywa specyfikacja, a rozbieżność trafia do [open-questions.md](../docs/open-questions.md).

## Dodanie ekranu

1. Wygeneruj ekran w Stitch (styl zgodny z wybranym wariantem).
2. Zapisz pliki zgodnie z konwencją.
3. Zaktualizuj kolumny „Plik Stitch” i „Status” w [screens.md](../apps/web/docs/screens.md) (`brak projektu` → `projekt`).
4. Commit: `docs(design): dodano ekran <ID> <nazwa>`.
