import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SesionesService {
  constructor(private prisma: PrismaService) {}

  async findAll(usuarioId: string) {
    return this.prisma.sesion.findMany({
      where: { usuarioId },
    });
  }

  async revoke(id: string) {
    return this.prisma.sesion.update({
      where: { id },
      data: { revocada: true },
    });
  }
}
