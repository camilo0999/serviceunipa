import { Controller, Get, Query } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  /**
   * Métricas de alimentación
   * Query params opcionales: start (ISO), end (ISO)
   */
  @Get('food')
  async food(@Query('start') start?: string, @Query('end') end?: string) {
    return this.metricsService.foodMetrics(start, end);
  }

  /**
   * Métricas de transporte
   * Query params opcionales: start (ISO), end (ISO)
   */
  @Get('transport')
  async transport(@Query('start') start?: string, @Query('end') end?: string) {
    return this.metricsService.transportMetrics(start, end);
  }
}
