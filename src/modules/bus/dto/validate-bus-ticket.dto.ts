import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateBusTicketDto {
  @IsString()
  @IsNotEmpty()
  qrHash: string;
}
