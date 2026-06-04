import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { RolUsuario, TurnoUsuario } from '@prisma/client';

export class CreateUsuarioDto {
  @IsString()
  codigoEstudiantil: string;

  @IsString()
  nombre: string;

  @IsString()
  apellido: string;

  @IsEmail()
  email: string;

  @IsString()
  passwordHash: string;

  @IsEnum(RolUsuario)
  @IsOptional()
  rol?: RolUsuario;

  @IsEnum(TurnoUsuario)
  @IsOptional()
  turno?: TurnoUsuario;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsString()
  @IsOptional()
  fotoUrl?: string;
}
