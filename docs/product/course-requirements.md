# Wymagania przedmiotu (ZTPAI)

> Oficjalne wymagania prowadzącego, przeniesione bez zmian treści z `projekt_aplikacji_wymagania.txt` (dodano tylko formatowanie Markdown).
> **Nie modyfikuj tego pliku.** Mapowanie wymagań na projekt: [requirements-mapping.md](requirements-mapping.md).

## Aplikacja webowa - Backend + REST API + Frontend + baza danych

Projekt powinien przedstawiać kompletną aplikację realizującą wybrany problem biznesowy.
Student może samodzielnie wybrać technologie użyte do realizacji projektu.

### Dozwolone technologie

Backend: dowolny framework umożliwiający stworzenie REST API, np.:

- Spring Boot,
- NestJS / Express,
- ASP.NET Core,
- Django / FastAPI,
- Laravel,
- lub inny uzgodniony framework.

Frontend: dowolny współczesny framework lub library do tworzenia aplikacji webowych, np.:

- Angular,
- React,
- Vue,
- Svelte,
- lub inne porównywalne rozwiązanie.

Baza danych: wymagany jest pełnoprawny system zarządzania bazą danych działający jako osobna usługa, np.:

- PostgreSQL,
- MySQL,
- MariaDB,
- Microsoft SQL Server.

Nie są akceptowane jako docelowa baza projektu:

- SQLite,
- H2,
- bazy działające wyłącznie in-memory,
- inne rozwiązania embedded przeznaczone głównie do prostych aplikacji lokalnych lub testów.

Inna baza danych, np. MongoDB, może zostać wykorzystana po wcześniejszym uzgodnieniu.

## Ocena 3.0 - Dostateczny

Projekt musi zawierać:

- działającą aplikację backendową,
- REST API,
- połączenie z bazą danych,
- minimum 3 encje / modele danych,
- minimum jedną relację pomiędzy danymi,
- operacje CRUD dla głównych zasobów,
- poprawne wykorzystanie metod HTTP,
- logiczny podział aplikacji na warstwy lub moduły odpowiedzialne za:
  - obsługę requestów,
  - logikę biznesową,
  - dostęp do danych,
- DTO lub analogiczny mechanizm oddzielający API od modelu bazy danych,
- walidację danych wejściowych,
- globalną obsługę błędów,
- minimum jedną własną regułę biznesową wykraczającą poza CRUD,
- trwałe zapisywanie danych w bazie danych,
- poprawne kody odpowiedzi HTTP.

Przykład reguły biznesowej:
Użytkownik nie może wypożyczyć książki, jeżeli nie ma dostępnych egzemplarzy.

## Ocena 4.0 - Dobry

Wszystko wymagane na ocenę 3.0 oraz:

- authentication użytkownika,
- authorization,
- minimum 2 role użytkowników, np. USER i ADMIN ,
- ograniczenie dostępu do wybranych endpointów zależnie od użytkownika lub jego roli,
- pagination dla przynajmniej jednego zasobu,
- wyszukiwanie lub filtrowanie danych,
- dokumentację REST API, np. Swagger / OpenAPI,
- minimum:
  - 5 unit tests logiki biznesowej,
  - 3 integration tests REST API,
- mechanizm migracji schematu bazy danych,
- poprawne zarządzanie konfiguracją aplikacji,
- brak haseł, tokenów, kluczy API i innych sekretów zapisanych bezpośrednio w repozytorium.

Logika biznesowa powinna być oddzielona od kodu odpowiedzialnego za obsługę HTTP.

## Ocena 5.0 - Bardzo dobry

Wszystko wymagane na ocenę 4.0 oraz:

- minimum 5 powiązanych encji / modeli danych tworzących spójny model biznesowy,
- minimum 3 różne reguły biznesowe,
- frontend wykonany przy użyciu wybranego frameworka lub library,
- frontend komunikujący się z REST API,
- logowanie użytkownika oraz obsługę authentication po stronie frontendu,
- obsługę minimum:
  - listowania danych,
  - dodawania danych,
  - edycji danych,
  - usuwania danych,
  - obsługi błędów API,
- wykorzystanie mechanizmu asynchronicznego, np.:
  - RabbitMQ,
  - Kafka,
  - event system dostępny w wybranym frameworku,
- testy dla najważniejszej logiki biznesowej,
- uruchamianie aplikacji przy użyciu Docker Compose,
- osobne kontenery minimum dla:
  - backendu,
  - bazy danych,
- poprawnie przygotowany plik README.md umożliwiający uruchomienie projektu przez inną osobę.

Dodatkowo projekt powinien zawierać przynajmniej jeden element rozszerzony, np.:

- cache,
- wysyłanie e-maili,
- scheduler,
- upload plików,
- WebSocket,
- integrację z zewnętrznym API,
- optimistic locking,
- CI przy użyciu GitHub Actions.

Element powinien mieć rzeczywiste zastosowanie w projekcie.
Samo zainstalowanie biblioteki, dodanie dependency lub stworzenie pustej konfiguracji nie jest traktowane jako realizacja wymagania.

## Wymagania formalne

Każdy projekt musi zawierać:

- link do repozytorium GitHub oraz wskazanie commita lub tagu stanowiącego ostateczną wersję projektu podlegającą ocenie. Zmiany wprowadzone po oddaniu projektu nie są uwzględniane podczas oceny,
- historię commitów pokazującą rozwój projektu,
- README.md zawierający:
  - opis projektu,
  - użyte technologie,
  - instrukcję uruchomienia,
  - opis głównych funkcjonalności,
  - diagram modelu danych / ERD,
  - dokumentację REST API,
- demo video 3-5 minut pokazujące najważniejsze funkcjonalności projektu.

Podczas demonstracji student powinien być w stanie krótko wyjaśnić:

- architekturę i strukturę projektu,
- przepływ requestu od endpointu do bazy danych,
- model danych,
- sposób działania authentication i authorization,
- przynajmniej jedną zaimplementowaną regułę biznesową.

## Ważne

Spełnienie wymagań technicznych nie gwarantuje danej oceny, jeżeli poszczególne elementy projektu nie działają.
Funkcjonalności wymagane dla niższej oceny muszą być spełnione, aby możliwe było uzyskanie oceny wyższej.
Projekt ograniczający się wyłącznie do prostego CRUD bez własnej logiki biznesowej nie spełnia wymagań projektu.
