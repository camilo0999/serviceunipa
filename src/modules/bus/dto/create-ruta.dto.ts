import { IsString, IsInt, Min } from 'class-validator';

export class CreateRutaDto {
  @IsString()
  nombre: string;

  @IsString()
  origen: string;

  @IsString()
  destino: string;

  @IsInt()
  @Min(1)
  capacidadTotal: number;
}
