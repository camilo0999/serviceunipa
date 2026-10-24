import { PartialType } from '@nestjs/swagger';
import { CreateUsuarioDto } from './create-usuario.dto';

/**
 * DTO administrativo. Permite modificar cualquier campo del usuario,
 * incluidos rol, turno, estado y contraseña.
 */
export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {}
