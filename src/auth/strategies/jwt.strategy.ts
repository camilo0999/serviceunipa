import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getJwtSecret } from '../jwt-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: any) {
    if (!payload?.sub || !payload?.jti) {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        rol: true,
        nombre: true,
        apellido: true,
        fotoUrl: true,
        activo: true,
      },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario inactivo o inexistente');
    }

    const isBlacklisted = await this.prisma.tokenBlacklist.findUnique({
      where: { tokenJti: payload.jti },
    });
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Se devuelven los datos actuales del usuario, no los congelados en el JWT.
    return {
      ...payload,
      email: user.email,
      rol: user.rol,
      nombre: user.nombre,
      apellido: user.apellido,
      foto_url: user.fotoUrl ?? null,
    };
  }
}
