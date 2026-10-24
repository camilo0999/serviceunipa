import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  Delete,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

type AuthenticatedUser = {
  sub: string;
  rol: RolUsuario | string;
};

@ApiTags('Usuarios')
@ApiBearerAuth('JWT-auth')
@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  /**
   * Crear usuario (solo administradores)
   * Registra un nuevo usuario en el sistema.
   */
  @Post()
  @Roles(RolUsuario.administrador)
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  /**
   * Listar todos los usuarios (solo administradores)
   * Obtiene la lista completa de usuarios registrados.
   */
  @Get()
  @Roles(RolUsuario.administrador)
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get('beneficios')
  @Roles(RolUsuario.estudiante)
  getBeneficios(@Request() req: { user: AuthenticatedUser }) {
    const usuarioId = req.user.sub;
    return this.usuariosService.getBeneficios(usuarioId);
  }

  @Get('horario')
  @Roles(RolUsuario.estudiante)
  getHorario(@Request() req: { user: AuthenticatedUser }) {
    const usuarioId = req.user.sub;
    return this.usuariosService.getHorario(usuarioId);
  }

  /**
   * Obtener un usuario por ID
   * Un administrador puede consultar cualquiera; un estudiante solo su propio perfil.
   */
  @Get(':id')
  @Roles(RolUsuario.administrador, RolUsuario.estudiante)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    this.assertOwnershipOrAdmin(req.user, id);
    return this.usuariosService.findOne(id);
  }

  /**
   * Actualizar usuario (solo administradores)
   * Modifica los datos de un usuario existente.
   */
  @Patch(':id')
  @Roles(RolUsuario.administrador)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
  ) {
    return this.usuariosService.update(id, updateUsuarioDto);
  }

  /**
   * Actualizar el propio perfil
   * Solo permite nombre, apellido y foto; nunca rol, estado ni contraseña.
   */
  @Patch(':id/perfil')
  @Roles(RolUsuario.administrador, RolUsuario.estudiante)
  updatePerfil(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePerfilDto: UpdatePerfilDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    this.assertOwnershipOrAdmin(req.user, id);
    return this.usuariosService.updatePerfil(id, updatePerfilDto);
  }

  /**
   * Eliminar usuario (solo administradores)
   * Remueve permanentemente a un usuario del sistema.
   */
  @Delete(':id')
  @Roles(RolUsuario.administrador)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.remove(id);
  }

  private assertOwnershipOrAdmin(user: AuthenticatedUser, id: string) {
    if (user?.rol === RolUsuario.administrador) return;
    if (!user?.sub || user.sub !== id) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a los datos de otro usuario.',
      );
    }
  }
}
