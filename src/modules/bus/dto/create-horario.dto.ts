import { IsString, IsDateString } from 'class-validator';

export class CreateHorarioDto {
  @IsDateString()
  horaPartida: string; // ISO time or full date depending on client
}
