import { IsString } from 'class-validator';

export class ValidateBusTicketDto {
  @IsString()
  qrHash: string;
}
