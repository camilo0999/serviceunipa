import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenBlacklistQueryDto } from './dto/token-blacklist-query.dto';

@Injectable()
export class TokenBlacklistService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: TokenBlacklistQueryDto) {
    const {
      page = 1,
      limit = 20,
      usuarioId,
      expiraDesde,
      expiraHasta,
      creadoDesde,
      creadoHasta,
      sortBy = 'creadoEn',
      sortOrder = 'desc',
    } = query;
    const where = {
      ...(usuarioId && { usuarioId }),
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
    const [tokens, total] = await this.prisma.$transaction([
      this.prisma.tokenBlacklist.findMany({
        where,
        include: { usuario: { select: this.userSelect } },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.tokenBlacklist.count({ where }),
    ]);

    return {
      data: tokens,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const token = await this.prisma.tokenBlacklist.findUnique({
      where: { id },
      include: { usuario: { select: this.userSelect } },
    });
    if (!token) {
      throw new NotFoundException('Registro de token no encontrado');
    }
    return token;
  }

  async cleanup() {
    return this.prisma.tokenBlacklist.deleteMany({
      where: {
        expiraEn: { lt: new Date() },
      },
    });
  }

  private readonly userSelect = {
    id: true,
    nombre: true,
    apellido: true,
    email: true,
    rol: true,
  } as const;
}
