# Warstwa HTTP (`modules/*/http`)

> Kontrolery, DTO, walidacja, Swagger, guardy, kody odpowiedzi, mappery i globalny filtr wyjątków. Czytaj przy dodawaniu lub zmianie endpointu.
> Konwencje kontraktu (kody, format błędu, paginacja): [api-conventions.md](../../../docs/architecture/api-conventions.md).

## Odpowiedzialność

Warstwa HTTP **tłumaczy** HTTP na wywołanie serwisu aplikacyjnego i wynik na DTO. Nie zawiera logiki biznesowej ani zapytań do bazy.

```ts
@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post(':id/confirm')
  @HttpCode(200)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Potwierdza rezerwację oczekującą', operationId: 'Reservations_confirm' })
  @ApiOkResponse({ type: ReservationDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  async confirm(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<ReservationDto> {
    const reservation = await this.reservations.confirm(id, user);
    return ReservationMapper.toDto(reservation);
  }
}
```

## Globalna konfiguracja (`main.ts`)

Enhancery (pipe, filtr, guardy) rejestruje `AppModule` przez DI, a ustawienia HTTP funkcja `configureApp(app)` z `src/app.setup.ts`. Tej samej funkcji używają `main.ts` i testy integracyjne (`test/integration/support/create-test-app.ts`), więc testy działają na identycznej konfiguracji.

| Element | Ustawienie | Gdzie |
|-|-|-|
| Prefiks | `app.setGlobalPrefix('api/v1')` | `configureApp` |
| Walidacja | `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: false } })` + `exceptionFactory` → `ValidationFailedException` | `APP_PIPE`, `common/errors/validation.ts` |
| Filtr | `AllExceptionsFilter` (`timestamp` z `Clock`) | `APP_FILTER` |
| Guardy | `ThrottlerGuard`, `JwtAuthGuard`, `RolesGuard` (globalne, przez `APP_GUARD`, w tej kolejności) | M4 |
| Middleware | `requestIdMiddleware` (`X-Request-Id`: poprawny `[\w-]{1,128}` od klienta albo UUID; `req.requestId`), `helmet()`, `cookie-parser` | `configureApp` |
| CORS | tylko gdy `CORS_ORIGINS` niepuste, z `credentials: true` | `configureApp` |
| Proxy | `app.set('trust proxy', 1)` (nginx), wyłączone `x-powered-by` | `configureApp` |
| Swagger | `/api/docs` (JSON: `/api/docs-json`), gdy `SWAGGER_ENABLED` | `main.ts`, `src/openapi/swagger.ts` |

## DTO i walidacja

- Pliki: `http/dto/create-room.dto.ts`, `room.dto.ts`, `list-reservations.query.ts`. Klasy z sufiksem `Dto` lub `Query`.
- Każde pole ma dekoratory class-validator **i** `@ApiProperty` (typ, przykład, opis po polsku).
- Daty kalendarzowe: `@IsDateString({ strict: true })` + `@Matches(/^\d{4}-\d{2}-\d{2}$/)`, a w kontrolerze lub mapperze konwersja na `CalendarDate`.
- Kwoty: `@IsInt() @Min(0)`, liczba groszy.
- Query: liczby przez `@Type(() => Number)`, listy przez `@Transform` (split po przecinku).
- Walidacja krzyżowa kształtu (np. `dateTo ≥ dateFrom`) jako własny dekorator → 400. Reguły biznesowe (np. BR-04) nie należą do DTO, bo są w domenie → 422.
- Wspólne (`common/http/pagination.ts`, `common/http/sort.ts`): `PaginationQuery` (`page`, `pageSize`), `SortQuery(pola, domyślne)` (`field:dir` z białej listy, 400 dla nieznanego pola) + `parseSort()`, `Paginated<T>` (typ wyniku serwisu) i `Paginated(ItemDto)` (generyczny DTO odpowiedzi dla Swaggera), `paginate()`, `toSkipTake()`:

```ts
export class ListReservationsQuery extends IntersectionType(
  PaginationQuery,
  SortQuery(['checkIn', 'number', 'createdAt'], 'checkIn:asc'),
) {}

export class ReservationPageDto extends Paginated(ReservationListItemDto) {} // nazwany schemat w OpenAPI
```

## Mappery

- `http/<feature>.mapper.ts`: statyczne funkcje `toDto(model)`, `toListItemDto(model)`.
- Wejściem jest model domenowy lub read model z repozytorium, nigdy obiekt Prismy przekazany „przelotem”.
- Mapper odpowiada za wykluczenie pól wrażliwych i za `url` zdjęć.

## Guardy i dekoratory (`common/`)

| Element | Rola |
|-|-|
| `@Public()` | wyłącza `JwtAuthGuard` |
| `@Roles(...roles)` | wymagane role (`RolesGuard` → 403 `FORBIDDEN`) |
| `@CurrentUser()` | `AuthUser { id, role }` z JWT |
| `@Throttle({ … })` | nadpisanie limitu ([security.md](../../../docs/architecture/security.md#rate-limiting)) |

Kontroler panelu bez `@Roles` jest błędem. Każdy kontroler deklaruje role jawnie.

## Kody odpowiedzi

- `POST` tworzący zasób: `201` + `res.location(...)` (helper `setLocation(res, '/api/v1/rooms', id)`). Wyjątek: rezerwacja publiczna ([guest-booking.md](../../../docs/features/guest-booking.md)).
- `DELETE`: `@HttpCode(204)`.
- Akcje (`confirm`, `cancel`, `login`, `refresh`): `@HttpCode(200)`.

## Mapowanie błędów

Jedyne miejsce tłumaczenia błędów na HTTP: `common/errors/all-exceptions.filter.ts` + `common/errors/error-http-map.ts`.

| Źródło | Wynik |
|-|-|
| `DomainError` (z polem `code`) | status z mapy `DOMAIN_ERROR_HTTP_STATUS` ([business-rules.md](../../../docs/architecture/business-rules.md#podsumowanie)), `message`, `details` z błędu |
| `NotFoundError` (aplikacyjny) | 404 `NOT_FOUND` |
| `ValidationPipe` (`ValidationFailedException`) | 400 `VALIDATION_ERROR`, `details.fields` (ścieżki z kropką, np. `guest.email`) |
| `HttpException` rzucony z ciałem `{ code, message, details? }` | status wyjątku i **jego** `code` (np. `new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message })`) |
| `HttpException` Nesta i Expressa (400/401/403/404/409/413/415/429) | kod według statusu (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE`, `RATE_LIMITED`) i polski komunikat domyślny; dotyczy też nieznanej trasy, złego JSON i `ParseUUIDPipe` (bez `details.fields`) |
| Naruszenie unique (`23505`) lub exclusion (`23P01`) niezmapowane w repozytorium (`isUnmappedConflict` z `infrastructure/prisma/prisma-errors.ts`) | 409 `CONFLICT` + log ostrzeżenia (to sygnał, że repozytorium powinno je zmapować) |
| `ServiceUnavailableException` (health check, wskaźnik `down`) | 503 `SERVICE_UNAVAILABLE`, wynik terminusa w `details` ([Q-27](../../../docs/open-questions.md#q-27)) |
| Inne (w tym `HttpException` o statusie spoza mapy) | 500 `INTERNAL_ERROR`, pełny stack tylko w logu z `requestId` |

Nowy błąd domenowy to klasa w `modules/<f>/domain/errors/` + kod w unii `DomainErrorCode` (`common/domain/domain-error.ts`) + wpis w `DOMAIN_ERROR_HTTP_STATUS` (bez niego kod się nie skompiluje) + kod w [business-rules.md](../../../docs/architecture/business-rules.md) lub [api-conventions.md](../../../docs/architecture/api-conventions.md).

## Swagger

- `@ApiTags('<moduł>')` na kontrolerze; `@ApiBearerAuth()` dla chronionych.
- `operationId` = `<Controller>_<method>` (np. `Rooms_create`). Domyślnie nadaje go `operationIdFactory` w `src/openapi/swagger.ts`; jawne `operationId` w `@ApiOperation` zabezpiecza nazwę przed zmianą nazwy metody. Wpływa na nazwy hooków orval: [ADR 0006](../../../docs/decisions/0006-openapi-contract-codegen.md).
- Odpowiedzi błędów: `@ApiResponse({ status: 409, type: ErrorResponseDto })` dla kodów z sekcji 5 dokumentu funkcjonalności.
- Enumy jako `@ApiProperty({ enum: ReservationStatus, enumName: 'ReservationStatus' })`, żeby orval wygenerował nazwany typ.
- Upload: `@ApiConsumes('multipart/form-data')` + `@ApiBody({ schema })`.
- Eksport: `src/openapi/export.ts` (po `nest build`) buduje `AppModule` w trybie `preview` (bez providerów, bez połączeń z bazą), wywołuje `SwaggerModule.createDocument` i zapisuje JSON z posortowanymi kluczami do `packages/api-client/openapi.json`. Brakujące zmienne env uzupełnia `src/config/openapi-export-env.ts`, więc eksport działa bez `.env` (CI `contract`).
- Odpowiedź błędu w dokumentacji ma zawsze schemat `ErrorResponseDto`, także gdy biblioteka (np. terminus) dokumentuje własny: odpowiedź i tak formatuje globalny filtr.

## Testy

Warstwę HTTP testujemy **integracyjnie** (supertest): kody, `Location`, format błędu, walidacja, guardy. Testy jednostkowe kontrolerów nie są wymagane.

- `createTestApp({ controllers?, now? })` (`test/integration/support/`): prawdziwy `AppModule` + `configureApp`, `CLOCK` nadpisany `FixedClock` (domyślnie `2026-08-01T10:00:00+02:00`).
- Mechanizmy wspólne bez endpointu (format błędów) testuje kontroler-sonda zdefiniowany w pliku testu: `test/integration/error-format.e2e-spec.ts`.
