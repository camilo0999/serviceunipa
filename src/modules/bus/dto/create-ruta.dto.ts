import { IsString, IsInt, Min, IsOptional, IsUrl, IsDateString } from 'class-validator';

export class CreateRutaDto {
  @IsString()
  nombre: string;

  @IsString()
  origen: string;

  @IsString()
  destino: string;

  @IsOptional()
  @IsUrl()
  fotoUrl?: string;

  @IsOptional()
  @IsDateString()
  horaSalida?: string;

  @IsInt()
  @Min(1)
  capacidadTotal: number;
}
