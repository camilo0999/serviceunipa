import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import type { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Iniciar sesión
   * Autentica al usuario usando email y contraseña, registrando la sesión y el dispositivo.
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: Request, @Body() loginDto: LoginDto) {
    return this.authService.login(
      req.user,
      req.ip || 'unknown',
      (req.headers['user-agent'] as string) || 'unknown',
    );
  }

  /**
   * Refrescar token de acceso
   * Genera un nuevo token JWT a partir de un token de refresco válido.
   */
  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    return this.authService.refresh(refreshToken);
  }

  /**
   * Cerrar sesión
   * Invalida el token JWT actual y revoca el token de refresco asociado.
   */
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Body('refresh_token') refreshToken: string,
  ) {
    const { sub, jti, exp } = req.user as any;
    await this.authService.logout(sub, jti, exp, refreshToken);
    return { message: 'Logged out successfully' };
  }
}
