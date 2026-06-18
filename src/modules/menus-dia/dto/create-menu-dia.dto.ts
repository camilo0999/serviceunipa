import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { TipoComida } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMenuDiaDto {
  @ApiProperty({ description: 'Fecha del menú (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  fecha: string;

  @ApiProperty({
    enum: TipoComida,
    description: 'Tipo de comida (desayuno, almuerzo, cena)',
  })
  @IsEnum(TipoComida)
  @IsNotEmpty()
  tipoComida: TipoComida;

  @ApiProperty({
    description: 'Hora de inicio del menú (e.g. 2026-06-16T08:00:00Z)',
  })
  @IsDateString()
  @IsNotEmpty()
  horaInicio: string;

  @ApiProperty({
    description: 'Hora de fin del menú (e.g. 2026-06-16T10:00:00Z)',
  })
  @IsDateString()
  @IsNotEmpty()
  horaFin: string;

  @ApiProperty({ description: 'Descripción de los alimentos del menú' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({
    description: 'Indica si el menú está activo',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
