import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  /**
   * Token de recuperación recibido por correo
   * @example abc123xyzToken
   */
  @IsString()
  @IsNotEmpty()
  token: string;

  /**
   * Nueva contraseña de acceso
   * @example NuevaContrasenaSegura123
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  new_password: string;
}
