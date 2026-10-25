import { IsNotEmpty, IsUUID } from 'class-validator';

export class GenerateBusTicketDto {
  @IsUUID()
  @IsNotEmpty()
  viajeId: string;
}
