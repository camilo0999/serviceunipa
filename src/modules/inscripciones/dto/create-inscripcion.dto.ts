import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateInscripcionDto {
  @ApiProperty({
    description: 'ID del usuario con rol estudiante',
    example: '3f1c2b7a-9d4e-4c8f-9a21-5b6d7e8f9a01',
  })
  @IsUUID()
  usuarioId: string;

  @ApiProperty({
    description: 'ID de la materia a inscribir',
    example: '0721e60b-898b-4507-83a8-77efc5214e9a',
  })
  @IsUUID()
  materiaId: string;

  @ApiProperty({
    description: 'Periodo académico de la inscripción',
    example: '2026-1',
    maxLength: 20,
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  semestre: string;
}
