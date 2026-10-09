# Funkcjonalność: Zdjęcia (upload)

> Upload, kolejność, opisy i usuwanie zdjęć obiektu i pokoi oraz ich serwowanie. Element rozszerzony „upload plików”.
> Etapy: M5 (API), M11 (UI). Port `StorageService`: [integrations.md](../../apps/api/docs/integrations.md#storage).

## 1. Cel i wartość dla użytkownika

Zdjęcia sprzedają nocleg. Właściciel dodaje je przez przeciągnięcie plików, ustala kolejność i zdjęcie główne, a gość widzi je na stronie obiektu.

## 2. Historyjki użytkownika

- Jako **właściciel** chcę przeciągnąć kilka zdjęć naraz, aby szybko uzupełnić galerię.
- Jako **właściciel** chcę zmienić kolejność zdjęć i wybrać zdjęcie główne.
- Jako **gość** chcę zobaczyć zdjęcia pokoju, zanim zarezerwuję.

## 3. Reguły biznesowe

- [BR-12](../architecture/business-rules.md#br-12): operacje tylko na zdjęciach własnych obiektów.
- Limity ([Q-14](../open-questions.md#q-14)): JPG, PNG lub WebP, ≤ 10 MB, maks. 20 zdjęć obiektu i 20 na pokój.

## 4. Model danych

[Photo](../architecture/data-model.md#photo).

## 5. Kontrakt API

| Metoda | Ścieżka | Rola | Request | Response | Błędy |
|-|-|-|-|-|-|
| `POST` | `/properties/:id/photos` | `OWNER`, `ADMIN` | `multipart/form-data`: `file`, `altText?` | `201` `PhotoDto` | `413 FILE_TOO_LARGE`, `415 UNSUPPORTED_FILE_TYPE`, `422 PHOTO_LIMIT_REACHED` |
| `POST` | `/rooms/:id/photos` | `OWNER`, `ADMIN` | j.w. | `201` `PhotoDto` | j.w. |
| `PATCH` | `/photos/:id` | `OWNER`, `ADMIN` | `{ altText?, sortOrder? }` | `200` `PhotoDto` | – |
| `DELETE` | `/photos/:id` | `OWNER`, `ADMIN` | – | `204` | – |
| `GET` | `/files/:storageKey` | publiczny | – | `200` plik (`Content-Type`, `Cache-Control: public, max-age=31536000, immutable`) | `404` |

- Jedno żądanie przesyła jeden plik. UI wysyła kilka plików równolegle (maks. 3 naraz).
- **`PhotoDto`**: `id`, `url` (`/api/v1/files/<storageKey>`), `altText`, `sortOrder`, `roomId | null`, `mimeType`, `sizeBytes`, `createdAt`.
- Nowe zdjęcie trafia na koniec (`sortOrder = max + 1`).
- `PATCH sortOrder = n` przesuwa zdjęcie na pozycję `n` i przenumerowuje pozostałe w tej samej galerii (obiekt albo pokój) w transakcji. Pozycja `0` oznacza zdjęcie główne.
- `storageKey` ma format `^[0-9a-f-]{36}\.(jpg|png|webp)$`; inny format → 404.

## 6. Backend: zadania

- [x] Port `STORAGE` (`common/storage/storage.ts`: `put`, `get` (stream), `delete`) + `LocalDiskStorage` (`STORAGE_LOCAL_PATH`).
- [x] Upload przez `FileInterceptor` (multer w pamięci przez `MulterModule.registerAsync`, limit `UPLOAD_MAX_BYTES`), błąd limitu → 413 `FILE_TOO_LARGE`.
- [x] Walidacja typu po magic bytes → 415: własna funkcja `modules/photos/domain/image-type.ts` (JPEG, PNG, WebP), bez zależności `file-type`.
- [x] `PhotosService`: limit liczby (422), zapis metadanych i pliku. Gdy zapis do DB się nie powiedzie, usuń plik (kompensacja).
- [x] Usuwanie: rekord w transakcji, plik po commicie (błąd usunięcia pliku tylko logujemy).
- [x] Przenumerowanie `sortOrder` w transakcji.
- [x] `FilesController` (`@Public`): strumieniowanie pliku, nagłówki cache.
- [x] Swagger: `@ApiConsumes('multipart/form-data')` + schemat body.

## 7. Frontend: ekrany i zadania

Ekrany: O7 zakładka „Zdjęcia”, O8 karta „Zdjęcia obiektu”, P1 galeria: [screens.md](../../apps/web/docs/screens.md).

- [x] Komponent `PhotoUploader`: drag-and-drop i wybór plików, walidacja typu i rozmiaru po stronie klienta, maks. 3 wysyłki naraz, stan wysyłki per plik (w kolejce / wysyłanie / gotowe / błąd – `fetch` nie raportuje postępu wysyłki, więc bez procentów), komunikaty dla 413, 415 i 422.
- [x] Siatka zdjęć z przeciąganiem (dnd-kit: mysz, dotyk, klawiatura; zmiana kolejności → `PATCH sortOrder`, optymistycznie), badge „Zdjęcie główne”, ikona usuwania z potwierdzeniem.
- [x] Edycja opisu (`altText`) inline.
- [ ] Na stronie publicznej: `loading="lazy"`, `alt` z `altText` lub nazwy pokoju.

## 8. Testy

| Przypadek | Poziom | Reguła |
|-|-|-|
| Upload JPG → 201, plik dostępny pod `url` | int | – |
| Plik `.exe` przemianowany na `.jpg` → 415 | int | – |
| Plik > limitu → 413 | int | – |
| 21. zdjęcie pokoju → 422 `PHOTO_LIMIT_REACHED` | int | – |
| Owner B → upload do pokoju ownera A → 404 | int | BR-12 |
| Przenumerowanie `sortOrder` (przesunięcie w górę i w dół) | unit | – |
| `GET /files/../etc/passwd` → 404 | int | – |
| `PhotoUploader`: odrzucenie złego typu bez wysyłki | ui | – |

## 9. Kryteria akceptacji

- [ ] Zdjęcia przetrwają restart kontenera `api` (wolumen `uploads`).
- [ ] Pierwsze zdjęcie pokoju jest jego zdjęciem głównym na stronie publicznej.
- [ ] Usunięcie zdjęcia usuwa plik z dysku.

## 10. Status i otwarte kwestie

| Warstwa | Status |
|-|-|
| API | Gotowe (M5) |
| UI | Panel gotowy (M11); strona publiczna M12 |

Otwarte: [Q-14](../open-questions.md#q-14) (limity).
