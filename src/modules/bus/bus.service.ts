import { Injectable, Logger, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from 'src/modules/redis/redis.service';
import { randomUUID } from 'crypto';

@Injectable()
export class BusService {
  private readonly logger = new Logger(BusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  // Rutas CRUD
  async createRuta(data: { nombre: string; origen: string; destino: string; capacidadTotal: number; fotoUrl?: string; horaSalida?: string }) {
    return this.prisma.ruta.create({
      data: {
        nombre: data.nombre,
        origen: data.origen,
        destino: data.destino,
        ...(data.fotoUrl && { fotoUrl: data.fotoUrl }),
        ...(data.horaSalida && { horaSalida: new Date(data.horaSalida) }),
        capacidadTotal: data.capacidadTotal,
      },
    });
  }

  async listRutas() {
    return this.prisma.ruta.findMany({ where: { activo: true } });
  }

  async getRuta(id: string) {
    const r = await this.prisma.ruta.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Ruta no encontrada');
    return r;
  }

  async toggleRutaEstado(id: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const ruta = await tx.ruta.findUnique({ where: { id } });
        if (!ruta) throw new NotFoundException('Ruta no encontrada');

        return tx.ruta.update({
          where: { id },
          data: { activo: !ruta.activo },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async addHorario(rutaId: string, horaPartida: string) {
    await this.getRuta(rutaId);
    return this.prisma.horario.create({ data: { rutaId, horaPartida: new Date(horaPartida) } });
  }

  // Crear viaje (instancia de ruta/horario) que tendrá capacidad y ocupados
  async createViaje(rutaId: string, horarioId: string | null, fecha?: string) {
    const ruta = await this.getRuta(rutaId);
    const capacidad = ruta.capacidadTotal;
    return this.prisma.viaje.create({ data: { rutaId, horarioId, capacidadTotal: capacidad, fecha: fecha ? new Date(fecha) : undefined } });
  }

  private async ensureViaje(viajeId: string) {
    const viaje = await this.prisma.viaje.findUnique({ where: { id: viajeId } });
    if (viaje) return viaje;

    const ruta = await this.prisma.ruta.findUnique({ where: { id: viajeId } });
    if (!ruta) throw new NotFoundException('Viaje no encontrado');

    const hoy = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    const viajeExistente = await this.prisma.viaje.findFirst({
      where: {
        rutaId: ruta.id,
        fecha: hoy,
        horarioId: null,
      },
    });

    if (viajeExistente) return viajeExistente;

    return this.prisma.viaje.create({
      data: {
        rutaId: ruta.id,
        horarioId: null,
        capacidadTotal: ruta.capacidadTotal,
        fecha: hoy,
      },
    });
  }

  // Generar ticket QR para bus
  async generateTicket(usuarioId: string, viajeId: string, expiresInMin = 30) {
    const viaje = await this.ensureViaje(viajeId);

    // Verificar disponibilidad básica
    if (viaje.ocupados >= viaje.capacidadTotal) {
      throw new ConflictException('Viaje lleno');
    }

    const ticketId = randomUUID();
    const expiraEn = new Date();
    expiraEn.setMinutes(expiraEn.getMinutes() + expiresInMin);

    const qrHash = this.jwtService.sign({ ticketId, usuarioId, viajeId }, { expiresIn: `${expiresInMin}m` });

    await this.prisma.busTicket.create({ data: { id: ticketId, usuarioId, viajeId, qrHash, expiraEn } });

    // Publish availability to Redis key
    const available = viaje.capacidadTotal - viaje.ocupados;
    await this.redisService.set(`viaje:availability:${viajeId}`, String(available), 60);

    return { qrHash, expiraEn };
  }

  // Validar/abordaje: escáner del bus
  async board(qrHash: string) {
    let payload: { ticketId: string; viajeId: string; usuarioId: string };
    try {
      payload = this.jwtService.verify(qrHash);
    } catch (e) {
      throw new UnauthorizedException('QR inválido o expirado');
    }

    const { ticketId, viajeId, usuarioId } = payload;
    const redisKey = `busticket:used:${ticketId}`;
    const used = await this.redisService.get(redisKey);
    if (used) throw new ConflictException('Ticket ya usado');

    await this.redisService.set(redisKey, 'true', 3600);

    const ticket = await this.prisma.busTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      await this.redisService.del(redisKey);
      throw new NotFoundException('Ticket no encontrado');
    }
    if (ticket.usado) {
      await this.redisService.del(redisKey);
      throw new ConflictException('Ticket ya fue usado');
    }

    // Atomically incrementar ocupados y marcar ticket usado
    const updatedViaje = await this.prisma.$transaction(async (tx) => {
      const v = await tx.viaje.findUnique({ where: { id: viajeId } });
      if (!v) throw new NotFoundException('Viaje no encontrado');
      if (v.ocupados >= v.capacidadTotal) throw new ConflictException('Viaje lleno');

      const vUpdated = await tx.viaje.update({ where: { id: viajeId }, data: { ocupados: { increment: 1 } } });

      await tx.busTicket.update({ where: { id: ticketId }, data: { usado: true, usadoEn: new Date() } });

      await tx.viajeRegistro.create({ data: { usuarioId, viajeId, accion: 'abordaje' } });

      return vUpdated;
    });

    // actualizar disponibilidad en Redis
    const available = updatedViaje!.capacidadTotal - updatedViaje!.ocupados;
    await this.redisService.set(`viaje:availability:${viajeId}`, String(available), 60);

    return { success: true, available };
  }

  async getAvailability(viajeId: string) {
    const cached = await this.redisService.get(`viaje:availability:${viajeId}`);
    if (cached !== null) return { disponible: Number(cached) };
    const v = await this.ensureViaje(viajeId);
    const available = v.capacidadTotal - v.ocupados;
    await this.redisService.set(`viaje:availability:${viajeId}`, String(available), 60);
    return { disponible: available };
  }

  async historyByUsuario(usuarioId: string) {
    const registros = await this.prisma.viajeRegistro.findMany({ where: { usuarioId }, include: { viaje: { include: { ruta: true } } }, orderBy: { creadoEn: 'desc' } });
    return registros;
  }
}
