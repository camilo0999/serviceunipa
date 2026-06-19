import { Controller, Get, Query, Res, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  /**
   * Exportar reportes históricos
   * Query: report=tickets|food|transport, format=csv|pdf, start, end
   */
  @Get('export')
  async export(
    @Query('report') report: string,
    @Query('format') format: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Res() res: Response,
  ) {
    if (!report) throw new BadRequestException('report es requerido');
    if (!format) format = 'csv';

    if (report === 'tickets') {
      if (format === 'csv') {
        const csv = await this.reportsService.ticketsHistoryCsv(start, end);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="tickets_${Date.now()}.csv"`);
        return res.send(csv);
      }
      if (format === 'pdf') {
        const buf = await this.reportsService.ticketsHistoryPdf(start, end);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="tickets_${Date.now()}.pdf"`);
        return res.send(buf);
      }
    }

    throw new BadRequestException('report/format no soportado');
  }
}
