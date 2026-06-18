import { Controller, Get, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { SesionesService } from './sesiones.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Sesiones')
@ApiBearerAuth('JWT-auth')
@Controller('sesiones')
@UseGuards(JwtAuthGuard)
export class SesionesController {
  constructor(private readonly sesionesService: SesionesService) {}

  /**
   * Listar sesiones del usuario
   * Obtiene una lista de todas las sesiones activas asociadas al usuario autenticado.
   */
  @Get()
  findAll(@Req() req: Request) {
    const user = req.user as any;
    return this.sesionesService.findAll(user.sub);
  }

  /**
   * Revocar sesión
   * Cierra/revoca una sesión activa específica por su ID.
   */
  @Patch(':id/revoke')
  revoke(@Param('id') id: string) {
    return this.sesionesService.revoke(id);
  }
}
