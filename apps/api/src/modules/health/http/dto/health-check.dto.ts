import { ApiProperty, ApiPropertyOptional, type ApiPropertyOptions } from '@nestjs/swagger';

export enum HealthStatus {
  Ok = 'ok',
  Error = 'error',
  ShuttingDown = 'shutting_down',
}

const indicatorsSchema: ApiPropertyOptions = {
  type: 'object',
  description: 'Wyniki wskaźników według nazwy usługi, np. `{ "database": { "status": "up" } }`',
  additionalProperties: {
    type: 'object',
    properties: { status: { type: 'string', enum: ['up', 'down'] } },
    required: ['status'],
    additionalProperties: true,
  },
};

/** Odpowiedź `GET /health` (format @nestjs/terminus). */
export class HealthCheckDto {
  @ApiProperty({ enum: HealthStatus, enumName: 'HealthStatus', example: HealthStatus.Ok })
  status: HealthStatus;

  @ApiPropertyOptional({ ...indicatorsSchema, example: {} })
  info?: Record<string, { status: string }>;

  @ApiPropertyOptional({ ...indicatorsSchema, example: {} })
  error?: Record<string, { status: string }>;

  @ApiProperty({ ...indicatorsSchema, example: {} })
  details: Record<string, { status: string }>;
}
