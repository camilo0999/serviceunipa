import { Controller, Get, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { SesionesService } from './sesiones.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

@Controller('sesiones')
@UseGuards(JwtAuthGuard)
export class SesionesController {
  constructor(private readonly sesionesService: SesionesService) {}

  @Get()
  findAll(@Req() req: Request) {
    const user = req.user as any;
    return this.sesionesService.findAll(user.sub);
  }

  @Patch(':id/revoke')
  revoke(@Param('id') id: string) {
    return this.sesionesService.revoke(id);
  }
}
