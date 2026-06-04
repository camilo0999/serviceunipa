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

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: Request) {
    return this.authService.login(
      req.user,
      req.ip || 'unknown',
      (req.headers['user-agent'] as string) || 'unknown',
    );
  }

  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    return this.authService.refresh(refreshToken);
  }

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
