import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO de autoservicio. Un usuario solo puede modificar sus propios datos
 * de perfil; nunca rol, turno, estado, correo, código ni contraseña.
 */
export class UpdatePerfilDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellido?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  fotoUrl?: string;
}
