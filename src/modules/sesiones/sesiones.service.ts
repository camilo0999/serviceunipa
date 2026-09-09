import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SesionesQueryDto } from './dto/sesiones-query.dto';

@Injectable()
export class SesionesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: SesionesQueryDto) {
    const {
      page = 1,
      limit = 20,
      usuarioId,
      revocada,
      expiraDesde,
      expiraHasta,
      creadoDesde,
      creadoHasta,
      sortBy = 'creadoEn',
      sortOrder = 'desc',
    } = query;
    const where = {
      ...(usuarioId && { usuarioId }),
      ...(revocada !== undefined && { revocada }),
      ...((expiraDesde || expiraHasta) && {
        expiraEn: {
          ...(expiraDesde && { gte: new Date(expiraDesde) }),
          ...(expiraHasta && { lte: new Date(expiraHasta) }),
        },
      }),
      ...((creadoDesde || creadoHasta) && {
        creadoEn: {
          ...(creadoDesde && { gte: new Date(creadoDesde) }),
          ...(creadoHasta && { lte: new Date(creadoHasta) }),
        },
      }),
    };
    const [sessions, total] = await this.prisma.$transaction([
      this.prisma.sesion.findMany({
        where,
        include: { usuario: { select: this.userSelect } },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sesion.count({ where }),
    ]);

    return {
      data: sessions.map((session) => this.toResponse(session)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const session = await this.prisma.sesion.findUnique({
      where: { id },
      include: { usuario: { select: this.userSelect } },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');
    return this.toResponse(session);
  }

  async revoke(id: string) {
    return this.prisma.sesion.update({
      where: { id },
      data: { revocada: true },
    });
  }

  private readonly userSelect = {
    id: true,
    nombre: true,
    apellido: true,
    email: true,
    rol: true,
  } as const;

  private toResponse(session: any) {
    return {
      id: session.id,
      usuarioId: session.usuarioId,
      refreshToken: this.maskToken(session.refreshToken),
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      revocada: session.revocada,
      expiraEn: session.expiraEn,
      creadoEn: session.creadoEn,
      usuario: session.usuario,
    };
  }

  private maskToken(token: string) {
    if (token.length <= 8) return '••••••••';
    return `${token.slice(0, 4)}••••••••${token.slice(-4)}`;
  }
}
