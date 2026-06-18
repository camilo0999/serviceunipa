import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateTicketDto {
  @ApiProperty({ description: 'Hash JWT del código QR' })
  @IsString()
  @IsNotEmpty()
  qrHash: string;
}
