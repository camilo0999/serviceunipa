import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  /**
   * Correo electrónico institucional
   * @example usuario@unipacifico.edu.co
   */
  @IsEmail()
  @IsNotEmpty()
  email: string;

  /**
   * Contraseña de acceso
   * @example ContrasenaSegura123
   */
  @IsString()
  @IsNotEmpty()
  contraseña: string;
}
