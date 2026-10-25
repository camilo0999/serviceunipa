import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from '../modules/usuarios/usuarios.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes, createHash, randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usuariosService.findByEmail(email);
    if (
      user &&
      user.activo &&
      (await bcrypt.compare(pass, user.passwordHash))
    ) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any, ipAddress: string, userAgent: string) {
    const accessToken = this.createAccessToken(user);
    const refreshToken = randomBytes(64).toString('hex');

    const expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + 30); // 30 days

    await this.prisma.sesion.create({
      data: {
        usuarioId: user.id,
        // Solo se persiste el hash; el valor en claro solo se entrega al cliente.
        refreshToken: this.hashRefreshToken(refreshToken),
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
    if (!oldToken || typeof oldToken !== 'string') {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const session = await this.prisma.sesion.findUnique({
      where: { refreshToken: this.hashRefreshToken(oldToken) },
    });
    if (
      !session ||
      session.revocada ||
      session.expiraEn < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usuariosService.findOne(session.usuarioId);
    if (!user.activo) {
      throw new UnauthorizedException('La cuenta está desactivada');
    }

    // Rotate token
    const newToken = randomBytes(64).toString('hex');
    const expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + 30);

    await this.prisma.sesion.update({
      where: { id: session.id },
      data: {
        refreshToken: this.hashRefreshToken(newToken),
        expiraEn,
      },
    });

    const accessToken = this.createAccessToken(user);

    return {
      access_token: accessToken,
      refresh_token: newToken,
    };
  }

  private createAccessToken(user: {
    id: string;
    email: string;
    rol: string;
    nombre: string;
    apellido: string;
    codigoEstudiantil?: string;
    turno?: string;
    fotoUrl?: string | null;
  }) {
    const payload = {
      email: user.email,
      sub: user.id,
      rol: user.rol,
      nombre: user.nombre,
      apellido: user.apellido,
      codigoEstudiantil: user.codigoEstudiantil ?? null,
      turno: user.turno ?? null,
      foto_url: user.fotoUrl ?? null,
    };

    return this.jwtService.sign(payload, {
      expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
      jwtid: randomUUID(),
    });
  }

  async logout(
    userId: string,
    jti: string,
    exp: number,
    refreshToken?: string,
  ) {
    // Revoca únicamente la sesión que pertenece a este usuario y cuyo
    // refresh token fue entregado explícitamente. Nunca revoca sesiones
    // de otros dispositivos ni de otros usuarios.
    if (refreshToken && typeof refreshToken === 'string') {
      await this.prisma.sesion.updateMany({
        where: {
          refreshToken: this.hashRefreshToken(refreshToken),
          usuarioId: userId,
          revocada: false,
        },
        data: { revocada: true },
      });
    }

    if (jti && Number.isFinite(exp)) {
      try {
        await this.prisma.tokenBlacklist.create({
          data: {
            tokenJti: jti,
            usuarioId: userId,
            expiraEn: new Date(exp * 1000),
          },
        });
      } catch (error: any) {
        // Un doble logout no debe producir un 500.
        if (error?.code !== 'P2002') throw error;
      }
    }
  }

  private hashRefreshToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
