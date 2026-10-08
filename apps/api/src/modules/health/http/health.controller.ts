import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthCheck, type HealthCheckResult, HealthCheckService } from '@nestjs/terminus';

import { Public } from '../../../common/auth/public.decorator';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { DatabaseHealthIndicator } from '../../../infrastructure/prisma/prisma.health';
import { HealthCheckDto } from './dto/health-check.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
  ) {}

  @Get()
  @Public()
  // Dokumentacja własna zamiast terminusa: 503 formatuje globalny filtr (ErrorResponseDto).
  @HealthCheck({ swaggerDocumentation: false })
  @ApiOperation({
    summary: 'Stan API i usług zależnych (healthcheck Dockera)',
    operationId: 'Health_check',
  })
  @ApiOkResponse({ description: 'API i usługi zależne działają', type: HealthCheckDto })
  @ApiServiceUnavailableResponse({
    description:
      'Co najmniej jedna usługa jest niedostępna (`SERVICE_UNAVAILABLE`, wynik wskaźników w `details`)',
    type: ErrorResponseDto,
  })
  check(): Promise<HealthCheckResult> {
    // M9: wskaźnik `redis`.
    return this.health.check([() => this.database.pingCheck('database')]);
  }
}
