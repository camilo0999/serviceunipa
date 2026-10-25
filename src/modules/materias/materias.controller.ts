import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { MateriasService } from './materias.service';
import { CreateMateriaDto } from './dto/create-materia.dto';
import { UpdateMateriaDto } from './dto/update-materia.dto';

@ApiTags('Materias')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('materias')
export class MateriasController {
  constructor(private readonly materiasService: MateriasService) {}

  @Post()
  @Roles(RolUsuario.administrador)
  @ApiOperation({ summary: 'Crear una materia' })
  @ApiResponse({ status: 409, description: 'El código ya existe.' })
  create(@Body() createMateriaDto: CreateMateriaDto) {
    return this.materiasService.create(createMateriaDto);
  }

  @Get()
  @Roles(RolUsuario.administrador, RolUsuario.estudiante)
  @ApiOperation({ summary: 'Listar materias con inscritos' })
  findAll() {
    return this.materiasService.findAll();
  }

  @Get(':id')
  @Roles(RolUsuario.administrador, RolUsuario.estudiante)
  @ApiOperation({ summary: 'Obtener una materia por ID' })
  @ApiResponse({ status: 404, description: 'Materia no encontrada.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.materiasService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.administrador)
  @ApiOperation({ summary: 'Actualizar una materia' })
  @ApiResponse({ status: 409, description: 'El código ya existe.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMateriaDto: UpdateMateriaDto,
  ) {
    return this.materiasService.update(id, updateMateriaDto);
  }

  @Delete(':id')
  @Roles(RolUsuario.administrador)
  @ApiOperation({ summary: 'Eliminar una materia sin inscripciones' })
  @ApiResponse({
    status: 409,
    description: 'La materia tiene estudiantes inscritos.',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.materiasService.remove(id);
  }
}
