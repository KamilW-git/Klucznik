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

| Element | Ustawienie |
|-|-|
| Prefiks | `app.setGlobalPrefix('api/v1')` |
| Walidacja | `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: false } })` |
| Filtr | `AllExceptionsFilter` (globalny, przez `APP_FILTER`) |
| Guardy | `ThrottlerGuard`, `JwtAuthGuard`, `RolesGuard` (globalne, przez `APP_GUARD`, w tej kolejności) |
| Middleware | `helmet()`, `cookie-parser`, `RequestIdMiddleware` (`X-Request-Id`) |
| Proxy | `app.set('trust proxy', 1)` (nginx) |
| Swagger | `/api/docs`, gdy `SWAGGER_ENABLED` |

## DTO i walidacja

- Pliki: `http/dto/create-room.dto.ts`, `room.dto.ts`, `list-reservations.query.ts`. Klasy z sufiksem `Dto` lub `Query`.
- Każde pole ma dekoratory class-validator **i** `@ApiProperty` (typ, przykład, opis po polsku).
- Daty kalendarzowe: `@IsDateString({ strict: true })` + `@Matches(/^\d{4}-\d{2}-\d{2}$/)`, a w kontrolerze lub mapperze konwersja na `CalendarDate`.
- Kwoty: `@IsInt() @Min(0)`, liczba groszy.
- Query: liczby przez `@Type(() => Number)`, listy przez `@Transform` (split po przecinku).
- Walidacja krzyżowa kształtu (np. `dateTo ≥ dateFrom`) jako własny dekorator → 400. Reguły biznesowe (np. BR-04) nie należą do DTO, bo są w domenie → 422.
- Wspólne: `PaginationQuery` (`page`, `pageSize`), `SortQuery` (parsowanie `field:dir` z białej listy), `Paginated<T>` (generyczny DTO odpowiedzi dla Swaggera).

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
| `DomainError` (z polem `code`) | status z mapy `code → status` ([business-rules.md](../../../docs/architecture/business-rules.md#podsumowanie)), `message`, `details` z błędu |
| `NotFoundError` (aplikacyjny) | 404 `NOT_FOUND` |
| `ValidationPipe` (`BadRequestException`) | 400 `VALIDATION_ERROR`, `details.fields` |
| `HttpException` Nesta (401/403/413/429) | odpowiadający `code` (`UNAUTHORIZED`, `FORBIDDEN`, `FILE_TOO_LARGE`, `RATE_LIMITED`) |
| Prisma `P2002` niezmapowane w repozytorium | 409 `CONFLICT` + log ostrzeżenia (to sygnał, że repozytorium powinno je zmapować) |
| Inne | 500 `INTERNAL_ERROR`, pełny stack tylko w logu z `requestId` |

Nowy błąd domenowy to klasa w `modules/<f>/domain/errors/` + wpis w mapie + kod w [business-rules.md](../../../docs/architecture/business-rules.md) lub [api-conventions.md](../../../docs/architecture/api-conventions.md).

## Swagger

- `@ApiTags('<moduł>')` na kontrolerze; `@ApiBearerAuth()` dla chronionych.
- `operationId` = `<Controller>_<method>` (np. `Rooms_create`). Wpływa na nazwy hooków orval: [ADR 0006](../../../docs/decisions/0006-openapi-contract-codegen.md).
- Odpowiedzi błędów: `@ApiResponse({ status: 409, type: ErrorResponseDto })` dla kodów z sekcji 5 dokumentu funkcjonalności.
- Enumy jako `@ApiProperty({ enum: ReservationStatus, enumName: 'ReservationStatus' })`, żeby orval wygenerował nazwany typ.
- Upload: `@ApiConsumes('multipart/form-data')` + `@ApiBody({ schema })`.
- Eksport: `src/openapi/export.ts` buduje `AppModule` bez `listen`, wywołuje `SwaggerModule.createDocument` i zapisuje posortowany JSON do `packages/api-client/openapi.json`.

## Testy

Warstwę HTTP testujemy **integracyjnie** (supertest): kody, `Location`, format błędu, walidacja, guardy. Testy jednostkowe kontrolerów nie są wymagane.
