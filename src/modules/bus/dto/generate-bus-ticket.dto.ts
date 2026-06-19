import { IsString } from 'class-validator';

export class GenerateBusTicketDto {
  @IsString()
  viajeId: string;
}
