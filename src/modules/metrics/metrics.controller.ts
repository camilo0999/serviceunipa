import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Metrics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.administrador)
@Controller('metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  /**
   * Métricas de alimentación (solo administradores)
   * Query params opcionales: start (ISO), end (ISO)
   */
  @Get('food')
  async food(@Query('start') start?: string, @Query('end') end?: string) {
    return this.metricsService.foodMetrics(start, end);
  }

  /**
   * Métricas de transporte (solo administradores)
   * Query params opcionales: start (ISO), end (ISO)
   */
  @Get('transport')
  async transport(@Query('start') start?: string, @Query('end') end?: string) {
    return this.metricsService.transportMetrics(start, end);
  }
}
