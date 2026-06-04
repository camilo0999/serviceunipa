import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { PlataformaDispositivo } from '@prisma/client';

export class CreateDispositivoDto {
  @IsString()
  fcmToken: string;

  @IsEnum(PlataformaDispositivo)
  plataforma: PlataformaDispositivo;

  @IsString()
  @IsOptional()
  modelo?: string;
}
