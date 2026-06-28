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
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Usuarios')
@ApiBearerAuth('JWT-auth')
@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  /**
   * Crear usuario
   * Registra un nuevo usuario en el sistema.
   */
  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  /**
   * Listar todos los usuarios
   * Obtiene la lista completa de usuarios registrados.
   */
  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get('beneficios')
  @Roles(RolUsuario.estudiante)
  getBeneficios(@Request() req: { user: { sub: string } }) {
    const usuarioId = req.user.sub;
    return this.usuariosService.getBeneficios(usuarioId);
  }

  @Get('horario')
  @Roles(RolUsuario.estudiante)
  getHorario(@Request() req: { user: { sub: string } }) {
    const usuarioId = req.user.sub;
    return this.usuariosService.getHorario(usuarioId);
  }

  /**
   * Obtener un usuario por ID
   * Recupera los detalles de un usuario específico.
   * Funciona para usuarios con rol de estudiante, ya que solo ellos pueden acceder a su propia información.
   */
  @Get(':id')
  @Roles(RolUsuario.estudiante)
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  /**
   * Actualizar usuario
   * Modifica los datos de un usuario existente.
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUsuarioDto: UpdateUsuarioDto) {
    return this.usuariosService.update(id, updateUsuarioDto);
  }

  /**
   * Eliminar usuario
   * Remueve permanentemente a un usuario del sistema.
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(id);
  }
}
