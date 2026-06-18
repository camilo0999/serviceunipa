import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateTicketDto {
  @ApiProperty({ description: 'ID del menú del día' })
  @IsUUID()
  @IsNotEmpty()
  menuDiaId: string;
}
