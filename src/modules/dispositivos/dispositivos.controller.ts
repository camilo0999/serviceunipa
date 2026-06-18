import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DispositivosService } from './dispositivos.service';
import { CreateDispositivoDto } from './dto/create-dispositivo.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Dispositivos')
@ApiBearerAuth('JWT-auth')
@Controller('dispositivos')
@UseGuards(JwtAuthGuard)
export class DispositivosController {
  constructor(private readonly dispositivosService: DispositivosService) {}

  /**
   * Registrar dispositivo
   * Asocia un dispositivo móvil (token FCM) al usuario autenticado.
   */
  @Post()
  register(@Req() req: Request, @Body() dto: CreateDispositivoDto) {
    const user = req.user as any;
    return this.dispositivosService.register(user.sub, dto);
  }

  /**
   * Listar dispositivos del usuario
   * Obtiene la lista de todos los dispositivos asociados al usuario autenticado.
   */
  @Get()
  findAll(@Req() req: Request) {
    const user = req.user as any;
    return this.dispositivosService.findAll(user.sub);
  }

  /**
   * Desactivar dispositivo
   * Desactiva un dispositivo móvil mediante su ID, deteniendo las notificaciones.
   */
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.dispositivosService.deactivate(id);
  }
}
