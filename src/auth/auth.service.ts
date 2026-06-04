import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from '../modules/usuarios/usuarios.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usuariosService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any, ipAddress: string, userAgent: string) {
    const payload = { email: user.email, sub: user.id, rol: user.rol };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
    });
    const refreshToken = randomBytes(64).toString('hex');

    const expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + 30); // 30 days

    await this.prisma.sesion.create({
      data: {
        usuarioId: user.id,
        refreshToken,
        ipAddress,
        userAgent,
        expiraEn,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async refresh(oldToken: string) {
    const session = await this.prisma.sesion.findUnique({
      where: { refreshToken: oldToken },
    });
    if (!session || session.revocada || session.expiraEn < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate token
    const newToken = randomBytes(64).toString('hex');
    const expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + 30);

    await this.prisma.sesion.update({
      where: { id: session.id },
      data: { refreshToken: newToken, expiraEn },
    });

    const user = await this.usuariosService.findOne(session.usuarioId);
    const payload = { email: user.email, sub: user.id, rol: user.rol };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
    });

    return {
      access_token: accessToken,
      refresh_token: newToken,
    };
  }

  async logout(userId: string, jti: string, exp: number, refreshToken: string) {
    await this.prisma.sesion.updateMany({
      where: { refreshToken },
      data: { revocada: true },
    });

    await this.prisma.tokenBlacklist.create({
      data: {
        tokenJti: jti,
        usuarioId: userId,
        expiraEn: new Date(exp * 1000),
      },
    });
  }
}
