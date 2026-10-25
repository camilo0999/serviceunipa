import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { InscripcionesService } from './inscripciones.service';
import { CreateInscripcionDto } from './dto/create-inscripcion.dto';
import { ListInscripcionesQueryDto } from './dto/list-inscripciones-query.dto';

@ApiTags('Inscripciones')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.administrador)
@Controller('inscripciones')
export class InscripcionesController {
  constructor(private readonly inscripcionesService: InscripcionesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar inscripciones de materias con filtros opcionales',
  })
  findAll(@Query() query: ListInscripcionesQueryDto) {
    return this.inscripcionesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una inscripción por ID' })
  @ApiResponse({ status: 404, description: 'Inscripción no encontrada.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.inscripcionesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Inscribir una materia a un estudiante' })
  @ApiResponse({
    status: 400,
    description: 'El usuario no tiene rol estudiante.',
  })
  @ApiResponse({ status: 409, description: 'La inscripción ya existe.' })
  create(@Body() createInscripcionDto: CreateInscripcionDto) {
    return this.inscripcionesService.create(createInscripcionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una inscripción' })
  @ApiResponse({ status: 404, description: 'Inscripción no encontrada.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.inscripcionesService.remove(id);
  }
}
