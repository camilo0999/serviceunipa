import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { RolUsuario, TurnoUsuario } from '@prisma/client';

export class CreateUsuarioDto {
  /**
   * Código de identificación estudiantil o administrativo
   * @example 2026115045
   */
  @IsString()
  codigoEstudiantil: string;

  /**
   * Primer y segundo nombre del usuario
   * @example Juan Carlos
   */
  @IsString()
  nombre: string;

  /**
   * Primer y segundo apellido del usuario
   * @example Pérez Gómez
   */
  @IsString()
  apellido: string;

  /**
   * Correo electrónico institucional del usuario
   * @example juan.perez@unipacifico.edu.co
   */
  @IsEmail()
  email: string;

  /**
   * Contraseña en texto plano. El servidor la almacena únicamente como hash.
   * @example ContrasenaSegura123
   */
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  /**
   * Rol que desempeñará el usuario en el sistema
   * @example estudiante
   */
  @IsEnum(RolUsuario)
  @IsOptional()
  rol?: RolUsuario;

  /**
   * Turno de acceso o estudio asignado al usuario
   * @example mixto
   */
  @IsEnum(TurnoUsuario)
  @IsOptional()
  turno?: TurnoUsuario;

  /**
   * Define si el usuario se encuentra activo para acceder al sistema
   * @example true
   */
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  /**
   * URL de la foto de perfil del usuario
   * @example https://unipacifico.edu.co/fotos/juan_perez.jpg
   */
  @IsString()
  @IsOptional()
  fotoUrl?: string;
}
