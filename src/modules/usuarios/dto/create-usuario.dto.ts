import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsBoolean,
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
   * Hash de la contraseña o contraseña en texto plano para encriptación inicial
   * @example ContrasenaSegura123
   */
  @IsString()
  passwordHash: string;

  /**
   * Rol que desempeñará el usuario en el sistema
   * @example ESTUDIANTE
   */
  @IsEnum(RolUsuario)
  @IsOptional()
  rol?: RolUsuario;

  /**
   * Turno de acceso o estudio asignado al usuario
   * @example DIURNO
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
