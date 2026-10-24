import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SesionesService } from './sesiones.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SesionesQueryDto } from './dto/sesiones-query.dto';

@ApiTags('Sesiones')
@ApiBearerAuth('JWT-auth')
@Controller('sesiones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SesionesController {
  constructor(private readonly sesionesService: SesionesService) {}

  @Get()
  @Roles(RolUsuario.administrador)
  @ApiOperation({ summary: 'Listar registros de sesiones' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'usuarioId', required: false, type: String })
  @ApiQuery({ name: 'revocada', required: false, type: Boolean })
  @ApiQuery({ name: 'expiraDesde', required: false, type: String })
  @ApiQuery({ name: 'expiraHasta', required: false, type: String })
  @ApiQuery({ name: 'creadoDesde', required: false, type: String })
  @ApiQuery({ name: 'creadoHasta', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['expiraEn', 'creadoEn'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 403, description: 'Solo administradores.' })
  findAll(@Query() query: SesionesQueryDto) {
    return this.sesionesService.findAll(query);
  }

  @Get(':id')
  @Roles(RolUsuario.administrador)
  @ApiOperation({ summary: 'Obtener un registro de sesión' })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sesionesService.findOne(id);
  }

  /**
   * Revocar sesión
   * Cierra/revoca una sesión activa específica por su ID.
   */
  @Patch(':id/revoke')
  @Roles(RolUsuario.administrador)
  revoke(@Param('id', ParseUUIDPipe) id: string) {
    return this.sesionesService.revoke(id);
  }
}
