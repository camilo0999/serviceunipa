import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MenusDiaService } from './menus-dia.service';
import { CreateMenuDiaDto } from './dto/create-menu-dia.dto';
import { UpdateMenuDiaDto } from './dto/update-menu-dia.dto';
import { GenerateTicketDto } from 'src/modules/tickets/dto/generate-ticket.dto';
import { ValidateTicketDto } from 'src/modules/tickets/dto/validate-ticket.dto';
import { TicketsService } from 'src/modules/tickets/tickets.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Menus del Dia')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('menus-dia')
export class MenusDiaController {
  constructor(
    private readonly menusDiaService: MenusDiaService,
    private readonly ticketsService: TicketsService,
  ) {}

  @Post()
  @Roles(RolUsuario.administrador, RolUsuario.operador_comedor)
  @ApiOperation({ summary: 'Crear un nuevo menú del día' })
  @ApiResponse({ status: 201, description: 'Menú creado exitosamente.' })
  create(@Body() createMenuDiaDto: CreateMenuDiaDto) {
    return this.menusDiaService.create(createMenuDiaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los menús del día' })
  @ApiResponse({
    status: 200,
    description: 'Lista de menús retornada exitosamente.',
  })
  findAll() {
    return this.menusDiaService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un menú por ID' })
  @ApiResponse({ status: 200, description: 'Menú retornado exitosamente.' })
  findOne(@Param('id') id: string) {
    return this.menusDiaService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.administrador, RolUsuario.operador_comedor)
  @ApiOperation({ summary: 'Actualizar un menú por ID' })
  @ApiResponse({ status: 200, description: 'Menú actualizado exitosamente.' })
  update(@Param('id') id: string, @Body() updateMenuDiaDto: UpdateMenuDiaDto) {
    return this.menusDiaService.update(id, updateMenuDiaDto);
  }

  @Post('tickets/generate')
  @Roles(RolUsuario.estudiante)
  @ApiOperation({ summary: 'Generar un ticket QR para el menú del día (Solo estudiantes)' })
  @ApiResponse({ status: 201, description: 'Ticket generado exitosamente.' })
  @ApiResponse({ status: 403, description: 'Estudiante no elegible para el menú.' })
  @ApiResponse({ status: 409, description: 'Ticket ya generado para este menú.' })
  generateTicket(
    @Request() req: { user: { sub: string } },
    @Body() generateTicketDto: GenerateTicketDto,
  ) {
    const usuarioId = req.user.sub;
    return this.ticketsService.generateTicket(usuarioId, generateTicketDto.menuDiaId);
  }

  @Post('tickets/validate')
  @Roles(RolUsuario.administrador, RolUsuario.operador_comedor)
  @ApiOperation({ summary: 'Validar un billete escaneado QR de alimentación (Solo operadores)' })
  @ApiResponse({ status: 200, description: 'Ticket válido y marcado como usado.' })
  @ApiResponse({ status: 401, description: 'Ticket inválido o expirado.' })
  @ApiResponse({ status: 409, description: 'Ticket ya fue utilizado.' })
  validateTicket(@Body() validateTicketDto: ValidateTicketDto) {
    return this.ticketsService.validateTicket(validateTicketDto.qrHash);
  }

  @Delete(':id')
  @Roles(RolUsuario.administrador, RolUsuario.operador_comedor)
  @ApiOperation({ summary: 'Eliminar un menú por ID' })
  @ApiResponse({ status: 200, description: 'Menú eliminado exitosamente.' })
  remove(@Param('id') id: string) {
    return this.menusDiaService.remove(id);
  }
}
