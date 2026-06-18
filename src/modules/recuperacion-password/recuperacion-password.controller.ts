import { Controller, Post, Body } from '@nestjs/common';
import { RecuperacionPasswordService } from './recuperacion-password.service';
import { RequestResetDto } from './dto/request-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Recuperación de Contraseña')
@Controller('auth/password')
export class RecuperacionPasswordController {
  constructor(
    private readonly recuperacionPasswordService: RecuperacionPasswordService,
  ) {}

  /**
   * Solicitar restablecimiento de contraseña
   * Envía un correo electrónico con un token único para restablecer la contraseña.
   */
  @Post('forgot')
  requestReset(@Body() requestResetDto: RequestResetDto) {
    return this.recuperacionPasswordService.requestReset(requestResetDto.email);
  }

  /**
   * Restablecer contraseña
   * Aplica la nueva contraseña usando el token de validación recibido por correo.
   */
  @Post('reset')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.recuperacionPasswordService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.new_password,
    );
  }
}
