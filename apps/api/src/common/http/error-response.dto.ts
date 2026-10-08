import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Wspólny format błędu (docs/architecture/api-conventions.md#format-błędu). */
export class ErrorResponseDto {
  @ApiProperty({ description: 'Kod HTTP', example: 409 })
  statusCode: number;

  @ApiProperty({ description: 'Nazwa kodu HTTP', example: 'Conflict' })
  error: string;

  @ApiProperty({
    description: 'Stabilny kod maszynowy (UPPER_SNAKE_CASE). UI rozpoznaje błędy wyłącznie po nim.',
    example: 'RESERVATION_OVERLAP',
  })
  code: string;

  @ApiProperty({
    description: 'Komunikat po polsku (pomocniczy)',
    example: 'Wybrany termin koliduje z inną rezerwacją.',
  })
  message: string;

  @ApiPropertyOptional({
    description:
      'Dane dodatkowe zależne od kodu. Dla VALIDATION_ERROR: `{ fields: [{ field, messages }] }`.',
    type: 'object',
    additionalProperties: true,
    example: { conflictingReservationNumber: 'KL-2026-000118' },
  })
  details?: Record<string, unknown>;

  @ApiProperty({ description: 'Ścieżka żądania', example: '/api/v1/properties/2b1…/reservations' })
  path: string;

  @ApiProperty({
    description: 'Czas błędu (ISO 8601 UTC)',
    format: 'date-time',
    example: '2026-08-01T10:15:30.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Identyfikator żądania (także w nagłówku X-Request-Id)',
    example: '6f0c2a7e-4c1b-4a8e-9a43-1d6f5f1c2b3a',
  })
  requestId: string;
}
