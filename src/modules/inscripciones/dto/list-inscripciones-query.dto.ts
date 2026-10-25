import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ListInscripcionesQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por estudiante' })
  @IsOptional()
  @IsUUID()
  usuarioId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por materia' })
  @IsOptional()
  @IsUUID()
  materiaId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por periodo académico' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  semestre?: string;

  @ApiPropertyOptional({
    description:
      'Buscar por nombre, código o correo del estudiante, o por materia',
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;
}
