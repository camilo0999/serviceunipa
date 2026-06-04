import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDispositivoDto } from './dto/create-dispositivo.dto';

@Injectable()
export class DispositivosService {
  constructor(private prisma: PrismaService) {}

  async register(usuarioId: string, dto: CreateDispositivoDto) {
    return this.prisma.dispositivo.upsert({
      where: { fcmToken: dto.fcmToken },
      update: { usuarioId, activo: true, ultimoUso: new Date() },
      create: { ...dto, usuarioId },
    });
  }

  async findAll(usuarioId: string) {
    return this.prisma.dispositivo.findMany({ where: { usuarioId } });
  }

  async deactivate(id: string) {
    return this.prisma.dispositivo.update({
      where: { id },
      data: { activo: false },
    });
  }
}
