import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestResetDto {
  /**
   * Correo electrónico registrado para el restablecimiento de contraseña
   * @example usuario@unipacifico.edu.co
   */
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
