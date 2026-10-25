import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Acepta HH:mm o HH:mm:ss. */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateMateriaDto {
  @ApiProperty({
    description: 'Código único de la materia',
    example: 'MAT-101',
    maxLength: 50,
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigo: string;

  @ApiProperty({
    description: 'Nombre de la materia',
    example: 'Cálculo diferencial',
    maxLength: 150,
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @ApiProperty({
    description: 'Hora de inicio en formato HH:mm',
    example: '07:00',
  })
  @Matches(TIME_PATTERN, {
    message: 'horaInicio debe tener un formato válido HH:mm',
  })
  horaInicio: string;

  @ApiProperty({
    description: 'Hora de finalización en formato HH:mm',
    example: '09:00',
  })
  @Matches(TIME_PATTERN, {
    message: 'horaFin debe tener un formato válido HH:mm',
  })
  horaFin: string;

  @ApiProperty({
    description: 'Días de clase (0=Domingo, 1=Lunes, ..., 6=Sábado)',
    example: [1, 3],
    type: [Number],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  diasSemana?: number[];
}
