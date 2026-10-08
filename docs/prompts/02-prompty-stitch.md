# Klucznik – prompty do Stitch (projekt widoków)

## Jak z tego korzystać

1. Utwórz w Stitch nowy projekt. Prompty są po angielsku, bo narzędzia tego typu zwykle lepiej je rozumieją, ale każdy wymusza polskie teksty w interfejsie.
2. **Wybierz styl.** Wygeneruj ekran P1 (strona obiektu) i O2 (dashboard) w trzech wariantach stylu: A, B i C. Porównaj je i wybierz jeden. Możesz też łączyć warianty, np. styl A dla strony gościa i styl B dla panelu.
3. **Generuj kolejne ekrany.** Rób to pojedynczo, w tym samym projekcie. Na początku każdego promptu wklej wybrany blok stylu albo dopisz: *"Keep exactly the same visual style as the previous screens."*
4. **Poprawiaj iteracyjnie** krótkimi poleceniami, np. *"make the table denser"*, *"move the main button higher"*.
5. **Eksportuj** PNG (i kod HTML, jeśli Stitch go udostępnia) do repo według konwencji:

```
design/stitch/public/01-property-page.png
design/stitch/public/01-property-page-mobile.png
design/stitch/owner/03-calendar.png
design/stitch/admin/01-owners.png
```

Oznaczenia ekranów mapują się na pliki tak: P1 → `public/01-...`, O3 → `owner/03-...`, A1 → `admin/01-...`.

Wskazówka: w całym projekcie używaj tych samych przykładowych danych (są w kontekście bazowym poniżej), żeby ekrany do siebie pasowały.

---

## Kontekst bazowy

Wklej go jako pierwszy prompt w projekcie albo dołączaj do każdego promptu.

```
Product: "Klucznik – Twój e-recepcjonista", a booking and management web app for small accommodation businesses in Poland (guesthouses, holiday cottages, guest rooms, agritourism farms). Three areas:
1) Public property page where guests check availability and book directly. White-label: it shows the property's own name and photos; Klucznik appears only as a small "Rezerwacje obsługuje Klucznik" note in the footer. Mobile-first.
2) "Panel Gospodarza" – owner dashboard for managing rooms, prices, blocked dates and reservations. Desktop-first, responsive.
3) Admin panel for the platform administrator.
Target owners are often 40–65 years old and not very tech-savvy: large readable text, clear labels, obvious primary actions, no clutter.
All UI text in Polish. Currency "zł" (e.g. "1 240 zł"), dates in dd.mm.yyyy format, calendar weeks start on Monday.
Sample data: property "Domki Leśna Polana" (Mazury); rooms "Domek Sosna" (4 os.), "Domek Brzoza" (6 os.), "Pokój Jeziorny" (2 os.), "Apartament Pod Dębem" (4 os.); owner "Jan Nowak"; guest "Anna Kowalska".
Reservation statuses with consistent colored badges: "Oczekuje" (amber), "Potwierdzona" (green), "Anulowana" (red/gray), "Wygasła" (gray), "Zakończona" (blue-gray).
```

---

## Warianty stylu (wybierz jeden)

### Styl A – "Leśna przystań" (ciepły, naturalny)

```
Visual style: warm and natural, cozy hospitality feel. Background warm off-white (#FAF7F2), primary deep forest green (#2F5D50), accent warm terracotta (#C8754A) used sparingly for highlights, text dark charcoal (#1F2A24). Rounded corners 12–16px, soft subtle shadows, generous spacing. Typography: friendly rounded sans-serif (e.g. "Nunito" or "DM Sans"), semi-bold headings. Large, high-quality nature photography (forest, lake, wooden cottages). Simple outline icons.
```

### Styl B – "Czysty SaaS" (nowoczesny, rzeczowy)

```
Visual style: clean modern SaaS. White background with light gray surfaces (#F6F7F9), primary deep teal (#0F766E), neutral gray borders (#E5E7EB), near-black text (#111827). Corner radius 8px, thin 1px borders instead of heavy shadows, crisp data tables, compact but readable density. Typography: "Inter" with a clear hierarchy of medium/semibold weights. Minimal decoration, focus on content and data.
```

### Styl C – "Butik" (elegancki, premium)

```
Visual style: elegant boutique hotel. Warm sand/beige background (#F4EFE6), primary dark navy (#1E2A3A), accent muted gold (#B08D57), charcoal text. Headings in a refined serif (e.g. "Fraunces" or "Playfair Display"), body in a clean sans-serif ("Inter"). Thin divider lines, lots of whitespace, large editorial photography, subtle rounded corners (6px).
```

---

## Strona publiczna (gość)

### P1 – Strona obiektu (desktop + mobile)

```
Screen: public property page for "Domki Leśna Polana" (guest-facing, white-label).
Layout top to bottom:
- Simple header with the property name as a text logo, anchor links "Pokoje", "O nas", "Lokalizacja", "Kontakt" and a primary button "Zarezerwuj".
- Hero: large photo of wooden cottages by a lake, property name, tagline "Cisza, las i jezioro na wyciągnięcie ręki", and a booking search bar with a date range picker "Przyjazd – Wyjazd", a guests selector "Goście" and a button "Sprawdź dostępność".
- Short "O nas" section with 3 icon highlights: "Prywatny pomost", "Sauna", "Zwierzęta mile widziane".
- "Nasze domki i pokoje": grid of room cards, each with photo, name, capacity "do 4 osób", 2–3 amenity icons, price "od 380 zł / noc" and a button "Zobacz terminy".
- Photo gallery strip.
- Location section with a map placeholder, address, and hours "Zameldowanie od 15:00, wymeldowanie do 11:00".
- Contact section with phone and e-mail.
- Footer with a small note "Rezerwacje obsługuje Klucznik".
Generate desktop and mobile versions. On mobile the search bar becomes a sticky bottom button "Sprawdź dostępność".
```

### P2 – Wyniki dostępności i wybór pokoju

```
Screen: availability results after the guest searched 14.08.2026 – 18.08.2026 (4 noce), 3 guests.
- Compact summary bar at the top with the selected dates, number of guests and a "Zmień" link.
- Available rooms as horizontal cards: photo, name, capacity, short description, amenities, total price in large text "1 640 zł za 4 noce" with a smaller line "(średnio 410 zł / noc)", and a primary button "Wybierz".
- One room shown as unavailable (dimmed, label "Niedostępny w tych dniach") and one with a note "Minimalny pobyt w sezonie: 3 noce".
- On desktop, a small calendar widget on the side with occupied days crossed out, to help pick other dates.
- Empty-state hint: "Brak wolnych pokoi w wybranym terminie – spróbuj innych dat".
Mobile-friendly layout.
```

### P3 – Formularz rezerwacji

```
Screen: booking form, step "Twoje dane".
Two columns on desktop, one column on mobile.
Left column – form fields "Imię", "Nazwisko", "E-mail", "Telefon", "Liczba gości" (prefilled with 3), textarea "Uwagi do rezerwacji (opcjonalnie)", checkbox "Akceptuję regulamin i politykę prywatności", primary button "Wyślij prośbę o rezerwację". Show the e-mail field in an error state with the message "Podaj poprawny adres e-mail".
Right column – sticky summary card: room photo and name "Domek Sosna", dates "14.08 – 18.08.2026 (4 noce)", guests, price breakdown per night (two nights at 450 zł in high season, two at 370 zł), total "1 640 zł", note "Rezerwacja wymaga potwierdzenia przez gospodarza – odpowiedź otrzymasz e-mailem", cancellation policy "Bezpłatne anulowanie do 7 dni przed przyjazdem".
Simple progress indicator: "Termin → Dane → Potwierdzenie".
```

### P4 – Potwierdzenie wysłania rezerwacji

```
Screen: booking request sent confirmation.
Centered card with a friendly success icon or illustration and the heading "Dziękujemy! Twoja prośba o rezerwację została wysłana". Below it: reservation number "KL-2026-000123", status badge "Oczekuje na potwierdzenie", and a summary of room, dates, guests and total price.
Info box: "Gospodarz potwierdzi rezerwację w ciągu 48 godzin. Szczegóły i link do zarządzania rezerwacją wysłaliśmy na adres anna.kowalska@example.com".
Secondary button "Wróć na stronę obiektu".
Mobile-friendly.
```

### P5 – Zarządzanie rezerwacją przez gościa (link z e-maila)

```
Screen: guest's reservation management page opened from an e-mail link (no login).
- Header with the property name.
- Reservation card: number, status badge "Potwierdzona", room with photo, dates, guests, total price, check-in/check-out hours, property contact (phone, e-mail), address with a "Pokaż na mapie" link.
- Cancellation section: text "Możesz bezpłatnie anulować rezerwację do 07.08.2026" and an outlined destructive button "Anuluj rezerwację".
- Also show the confirmation modal: "Czy na pewno chcesz anulować rezerwację?", optional reason textarea, buttons "Nie, wróć" and "Tak, anuluj".
- Variant after the deadline: the button is replaced with the text "Termin bezpłatnego anulowania minął – skontaktuj się z gospodarzem".
Mobile-first.
```

---

## Panel Gospodarza

### O1 – Logowanie

```
Screen: login page of "Panel Gospodarza". This screen shows Klucznik branding.
Split layout. Left side: a calm photo or illustration, the "Klucznik" logo (simple key icon) and the slogan "Twój e-recepcjonista – przyjmuje rezerwacje, także gdy śpisz". Right side: login card with "E-mail", "Hasło" (with show/hide toggle), link "Nie pamiętasz hasła?" and primary button "Zaloguj się".
Also show an error alert variant: "Nieprawidłowy e-mail lub hasło". Large, readable inputs.
```

### O2 – Pulpit (dashboard)

```
Screen: owner dashboard in "Panel Gospodarza".
App shell:
- Left sidebar with the "Klucznik" logo, a property switcher dropdown "Domki Leśna Polana", and navigation items "Pulpit", "Kalendarz", "Rezerwacje", "Pokoje", "Goście", "Ustawienia obiektu".
- Top bar with page title, search and user avatar menu "Jan Nowak".
Content:
- Greeting "Dzień dobry, Jan!" and today's date.
- 4 KPI cards: "Przyjazdy dziś: 2", "Wyjazdy dziś: 1", "Oczekujące rezerwacje: 3" (highlighted as needing action), "Obłożenie w tym miesiącu: 72%".
- Card "Wymagają Twojej decyzji": list of pending reservations with guest name, room, dates, price, time to expiry "wygasa za 21 h", and buttons "Potwierdź" and "Odrzuć".
- Card "Najbliższe przyjazdy" (next 7 days) as a compact list.
- Small occupancy bar chart for the next 30 days.
Desktop layout, responsive.
```

### O3 – Kalendarz obłożenia

```
Screen: occupancy calendar (timeline / Gantt view) in Panel Gospodarza. This is the most important owner screen.
- Toolbar: month navigation "‹ Sierpień 2026 ›", button "Dziś", view toggle "2 tygodnie / Miesiąc", primary button "+ Dodaj rezerwację", secondary button "+ Zablokuj termin".
- Grid: rows are rooms ("Domek Sosna", "Domek Brzoza", "Pokój Jeziorny", "Apartament Pod Dębem"); columns are days with weekday abbreviations (Pn, Wt, Śr...). Weekends are subtly shaded and today's column is highlighted.
- Reservations are horizontal colored bars spanning days, showing the guest's surname and number of guests. Colors follow the status: green for confirmed, amber with a striped pattern for pending. Blocked dates are gray hatched bars labeled "Blokada – remont".
- Hover tooltip on one bar with guest name, dates, price and status.
- Legend at the bottom.
Desktop layout; on mobile, suggest a simplified list per room.
```

### O4 – Lista rezerwacji i szczegóły

```
Screen: reservations list in Panel Gospodarza.
- Filters row: search "Szukaj po nazwisku, e-mailu lub numerze", status multi-select, room select, date range "Pobyt od – do", button "Wyczyść filtry".
- Data table with columns "Numer", "Gość", "Pokój", "Przyjazd", "Wyjazd", "Noce", "Goście", "Kwota", "Status", "Źródło" (Online / Ręczna) and a row actions menu.
- Pagination at the bottom: "1–20 z 134", page numbers, page size selector.
- Right-side drawer opened for one reservation:
  - header with number and status badge,
  - guest contact info, stay details, price breakdown, guest notes,
  - editable "Notatka wewnętrzna",
  - history timeline ("Utworzona online", "Potwierdzona przez gospodarza"),
  - action buttons "Potwierdź", "Edytuj", "Anuluj rezerwację".
- Also show a success toast "Rezerwacja została potwierdzona" and a conflict error alert "Ktoś w międzyczasie zmienił tę rezerwację – odśwież dane".
```

### O5 – Nowa rezerwacja ręczna

```
Screen: modal dialog "Nowa rezerwacja" in Panel Gospodarza, used for phone bookings.
Fields:
- room select,
- date range picker with occupied days disabled,
- number of guests,
- guest section with autocomplete "Wyszukaj gościa lub dodaj nowego" and fields "Imię", "Nazwisko", "E-mail", "Telefon",
- internal note.
Live price box: "Cena wyliczona: 1 520 zł (4 noce)". Info text: "Rezerwacja ręczna jest od razu potwierdzona".
Show an inline error: "Ten termin koliduje z inną rezerwacją (KL-2026-000118)".
Buttons "Anuluj" and "Zapisz rezerwację".
```

### O6 – Lista pokoi

```
Screen: rooms list in Panel Gospodarza.
Header "Pokoje i domki" with primary button "+ Dodaj pokój".
Grid of room cards, each with cover photo, name, capacity, base price "od 380 zł / noc", minimum stay, an active/inactive toggle labeled "Widoczny na stronie", number of upcoming reservations, an "Edytuj" button and a kebab menu. Show one card as inactive (dimmed).
Empty state variant: illustration and the text "Nie masz jeszcze żadnych pokoi – dodaj pierwszy, aby goście mogli rezerwować".
```

### O7 – Edycja pokoju (cennik i zdjęcia)

```
Screen: room edit page "Domek Sosna" in Panel Gospodarza with tabs "Informacje", "Zdjęcia", "Cennik", "Blokady terminów".
Main frame – "Cennik" tab active:
- Fields "Cena bazowa za noc" and "Minimalna liczba nocy".
- Seasonal rates table with columns "Nazwa" (e.g. "Wysoki sezon", "Majówka", "Sylwester"), "Od", "Do", "Cena za noc", "Min. nocy" and actions; button "+ Dodaj stawkę sezonową".
- A small year strip / mini calendar showing seasons in colors.
- Validation error example: "Ta stawka nakłada się na stawkę „Wysoki sezon”".
Secondary frame – "Zdjęcia" tab:
- Drag-and-drop upload area "Przeciągnij zdjęcia lub kliknij, aby wybrać (JPG, PNG, do 10 MB)".
- Grid of uploaded photos with drag handles for reordering, a "Zdjęcie główne" badge and a delete icon.
Sticky bottom bar with the button "Zapisz zmiany".
```

### O8 – Ustawienia obiektu

```
Screen: property settings in Panel Gospodarza, organized as cards:
- "Dane obiektu": name, public page address "klucznik.pl/o/lesna-polana" with a copy button, description, address, phone, contact e-mail.
- "Zasady pobytu": check-in from, check-out until.
- "Rezerwacje": "Bezpłatne anulowanie do X dni przed przyjazdem", "Niepotwierdzona rezerwacja wygasa po X godzinach".
- "Zdjęcia obiektu": cover photo upload.
Button "Zapisz zmiany" and a link "Podgląd strony obiektu".
```

---

## Administrator

### A1 – Właściciele

```
Screen: admin panel of the Klucznik platform, with a distinct accent label "Administrator" in the sidebar.
Sidebar items: "Właściciele", "Obiekty", "Logi e-maili".
Content: "Właściciele" table with columns "Imię i nazwisko", "E-mail", "Obiekty" (count), "Rezerwacje (30 dni)", "Status" (Aktywny / Zablokowany), "Utworzono" and actions. Search and pagination.
Primary button "+ Nowy właściciel" opens a dialog with fields "Imię", "Nazwisko", "E-mail", "Tymczasowe hasło" (with a generate button) and an option "Utwórz od razu obiekt" with a property name field.
Clean, dense, professional.
```

---

## Opcjonalnie

### S1 – Arkusz stanów i komponentów (przyda się do design systemu)

```
Screen: a component sheet showing the consistent states used across the app:
- loading skeletons for a table and for cards,
- empty state with illustration,
- error state "Coś poszło nie tak. Spróbuj ponownie" with a retry button,
- 404 page "Nie znaleziono strony",
- toast notifications (success, error, warning),
- status badges for all reservation statuses,
- primary, secondary and destructive buttons,
- form inputs in normal, focus, error and disabled states.
Use the same visual style as the other screens.
```

### E1 – E-mail z potwierdzeniem rezerwacji

```
Screen: transactional e-mail design, 600px wide, titled "Twoja rezerwacja została potwierdzona", sent to a guest by "Domki Leśna Polana".
Contents: header with the property name, greeting "Dzień dobry, Anno!", reservation summary table (number, room, dates, guests, total), check-in info, button "Zarządzaj rezerwacją", property contact, and a small footer "Rezerwacje obsługuje Klucznik".
Simple, table-friendly layout suitable for e-mail clients.
```
