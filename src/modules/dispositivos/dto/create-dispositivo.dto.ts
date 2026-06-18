import { IsString, IsEnum, IsOptional } from 'class-validator';
import { PlataformaDispositivo } from '@prisma/client';

export class CreateDispositivoDto {
  /**
   * Token FCM (Firebase Cloud Messaging) para notificaciones push
   * @example fcm_token_ejemplo_1234567890
   */
  @IsString()
  fcmToken: string;

  /**
   * Plataforma del dispositivo móvil
   * @example ANDROID
   */
  @IsEnum(PlataformaDispositivo)
  plataforma: PlataformaDispositivo;

  /**
   * Modelo o marca del dispositivo móvil
   * @example Samsung Galaxy S21
   */
  @IsString()
  @IsOptional()
  modelo?: string;
}
