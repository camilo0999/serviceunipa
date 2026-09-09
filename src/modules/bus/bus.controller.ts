import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { BusService } from './bus.service';
import { CreateRutaDto } from './dto/create-ruta.dto';
import { CreateHorarioDto } from './dto/create-horario.dto';
import { GenerateBusTicketDto } from './dto/generate-bus-ticket.dto';
import { ValidateBusTicketDto } from './dto/validate-bus-ticket.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { RolUsuario } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Transporte')
@ApiBearerAuth()
@Controller('bus')
export class BusController {
  constructor(private readonly busService: BusService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('rutas')
  @Roles(RolUsuario.administrador, RolUsuario.operador_bus)
  createRuta(@Body() dto: CreateRutaDto) {
    return this.busService.createRuta(dto as any);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('rutas')
  @Roles(RolUsuario.estudiante, RolUsuario.administrador, RolUsuario.operador_bus)
  listRutas() {
    return this.busService.listRutas();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('rutas/estado/:id')
  @Roles(RolUsuario.administrador, RolUsuario.operador_bus)
  toggleRutaEstado(@Param('id', ParseUUIDPipe) id: string) {
    return this.busService.toggleRutaEstado(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('rutas/:id')
  @Roles(RolUsuario.estudiante, RolUsuario.administrador, RolUsuario.operador_bus)
  getRuta(@Param('id') id: string) {
    return this.busService.getRuta(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('rutas/:id/horarios')
  @Roles(RolUsuario.administrador, RolUsuario.operador_bus)
  addHorario(@Param('id') id: string, @Body() dto: CreateHorarioDto) {
    return this.busService.addHorario(id, dto.horaPartida);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('tickets/generate')
  @Roles(RolUsuario.estudiante)
  @ApiOperation({ summary: 'Generar ticket de transporte para un viaje (Solo estudiantes)' })
  @ApiResponse({ status: 201, description: 'Ticket de transporte generado exitosamente.' })
  @ApiResponse({ status: 401, description: 'Autenticación requerida.' })
  generateTicket(@Request() req: { user: { sub: string } }, @Body() dto: GenerateBusTicketDto) {
    const usuarioId = req.user.sub;
    return this.busService.generateTicket(usuarioId, dto.viajeId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('tickets/validate')
  @Roles(RolUsuario.operador_bus, RolUsuario.administrador)
  @ApiOperation({ summary: 'Validar ticket QR de transporte (Solo operadores)' })
  @ApiResponse({ status: 200, description: 'Ticket válido y procesado.' })
  @ApiResponse({ status: 401, description: 'QR inválido o expirado.' })
  @ApiResponse({ status: 409, description: 'Ticket ya fue utilizado.' })
  validate(@Body() dto: ValidateBusTicketDto) {
    return this.busService.board(dto.qrHash);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('viajes/:id/availability')
  @Roles(RolUsuario.estudiante, RolUsuario.administrador, RolUsuario.operador_bus)
  availability(@Param('id') id: string) {
    return this.busService.getAvailability(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('usuario/:id/history')
  history(@Param('id') id: string) {
    return this.busService.historyByUsuario(id);
  }
}
