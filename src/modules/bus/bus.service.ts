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

  /**
   * Devuelve los viajes de hoy (reales, con id de Viaje) para una ruta.
   * Materializa los viajes que aún no existan a partir de la hora de salida
   * y de los horarios configurados, de modo que el cliente nunca tenga que
   * enviar el id de la ruta como si fuera el de un viaje.
   */
  async listViajesByRuta(rutaId: string) {
    const ruta = await this.getRuta(rutaId);
    const ahora = new Date();
    const hoy = new Date(
      Date.UTC(
        ahora.getUTCFullYear(),
        ahora.getUTCMonth(),
        ahora.getUTCDate(),
      ),
    );

    const horarios = await this.prisma.horario.findMany({
      where: { rutaId },
      orderBy: { horaPartida: 'asc' },
    });

    const salidas: Array<{
      horarioId: string | null;
      horaPartida: Date | null;
    }> = [];

    if (ruta.horaSalida) {
      salidas.push({ horarioId: null, horaPartida: ruta.horaSalida });
    }
    for (const horario of horarios) {
      salidas.push({ horarioId: horario.id, horaPartida: horario.horaPartida });
    }
    // Ruta sin horarios: se ofrece un viaje del día sin hora fija.
    if (!salidas.length) {
      salidas.push({ horarioId: null, horaPartida: null });
    }

    const viajes: Array<{
      id: string;
      rutaId: string;
      rutaNombre: string;
      origen: string;
      destino: string;
      horarioId: string | null;
      horaPartida: Date | null;
      fecha: Date | null;
      capacidadTotal: number;
      ocupados: number;
      disponible: number;
    }> = [];

    for (const salida of salidas) {
      const horaPartida = salida.horaPartida
        ? this.combineDateAndTime(hoy, salida.horaPartida)
        : null;

      // No se ofrecen salidas que ya pasaron.
      if (horaPartida && horaPartida.getTime() <= ahora.getTime()) continue;

      let viaje = await this.prisma.viaje.findFirst({
        where: {
          rutaId: ruta.id,
          fecha: hoy,
          horarioId: salida.horarioId,
        },
      });

      if (!viaje) {
        viaje = await this.prisma.viaje.create({
          data: {
            rutaId: ruta.id,
            horarioId: salida.horarioId,
            capacidadTotal: ruta.capacidadTotal,
            fecha: hoy,
          },
        });
      }

      viajes.push({
        id: viaje.id,
        rutaId: ruta.id,
        rutaNombre: ruta.nombre,
        origen: ruta.origen,
        destino: ruta.destino,
        horarioId: viaje.horarioId,
        horaPartida,
        fecha: viaje.fecha,
        capacidadTotal: viaje.capacidadTotal,
        ocupados: viaje.ocupados,
        disponible: Math.max(0, viaje.capacidadTotal - viaje.ocupados),
      });
    }

    return viajes.sort(
      (a, b) =>
        (a.horaPartida?.getTime() ?? Number.MAX_SAFE_INTEGER) -
        (b.horaPartida?.getTime() ?? Number.MAX_SAFE_INTEGER),
    );
  }

  /**
   * Un ticket siempre referencia un Viaje real. Ya no se acepta el id de una
   * ruta como sustituto: eso generaba tickets con `viaje_id` inválidos.
   */
  private async ensureViaje(viajeId: string) {
    const viaje = await this.prisma.viaje.findUnique({
      where: { id: viajeId },
      include: { ruta: true, horario: true },
    });
    if (!viaje) throw new NotFoundException('Viaje no encontrado');
    return viaje;
  }

  // Generar ticket QR para bus
  async generateTicket(usuarioId: string, viajeId: string, expiresInMin = 30) {
    const viaje = await this.ensureViaje(viajeId);

    // Verificar disponibilidad básica
    if (viaje.ocupados >= viaje.capacidadTotal) {
      throw new ConflictException('Viaje lleno');
    }

    // Anti-duplicado explícito (además del índice único usuario/viaje).
    const existing = await this.prisma.busTicket.findFirst({
      where: { usuarioId, viajeId: viaje.id },
    });
    if (existing) {
      throw new ConflictException('Ya has generado un ticket para este viaje');
    }

    const ticketId = randomUUID();
    const generadoEn = new Date();
    const expiraEn = new Date(generadoEn);
    expiraEn.setMinutes(expiraEn.getMinutes() + expiresInMin);

    const qrHash = this.jwtService.sign(
      { ticketId, usuarioId, viajeId: viaje.id },
      { expiresIn: `${expiresInMin}m` },
    );

    try {
      await this.prisma.busTicket.create({
        data: {
          id: ticketId,
          usuarioId,
          viajeId: viaje.id,
          qrHash,
          expiraEn,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya has generado un ticket para este viaje');
      }
      throw error;
    }

    // Publish availability to Redis key
    const available = viaje.capacidadTotal - viaje.ocupados;
    await this.redisService.set(
      `viaje:availability:${viaje.id}`,
      String(available),
      60,
    );

    return {
      id: ticketId,
      viajeId: viaje.id,
      qrHash,
      estado: 'pendiente',
      generadoEn,
      expiraEn,
      rutaNombre: viaje.ruta.nombre,
      origen: viaje.ruta.origen,
      destino: viaje.ruta.destino,
      horaPartida: viaje.horario?.horaPartida ?? viaje.ruta.horaSalida ?? null,
    };
  }

  // Validar/abordaje: escáner del bus
  async board(qrHash: string) {
    let payload: { ticketId: string; viajeId: string; usuarioId: string };
    try {
      payload = this.jwtService.verify(qrHash);
    } catch (e) {
      throw new UnauthorizedException('QR inválido o expirado');
    }

    const { ticketId } = payload;
    const redisKey = `busticket:used:${ticketId}`;
    const used = await this.redisService.get(redisKey);
    if (used) throw new ConflictException('Ticket ya usado');

    await this.redisService.set(redisKey, 'true', 3600);

    const ticket = await this.prisma.busTicket.findUnique({
      where: { id: ticketId },
      include: { usuario: true, viaje: { include: { ruta: true } } },
    });
    if (!ticket) {
      await this.redisService.del(redisKey);
      throw new NotFoundException('Ticket no encontrado');
    }
    if (ticket.usado) {
      await this.redisService.del(redisKey);
      throw new ConflictException('Ticket ya fue usado');
    }

    // El viaje y el usuario salen del ticket persistido, no del payload.
    const viajeId = ticket.viajeId;
    const usuarioId = ticket.usuarioId;

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

    return {
      success: true,
      mensaje: 'Ticket de transporte válido y procesado',
      available,
      usuario: {
        nombre: ticket.usuario.nombre,
        apellido: ticket.usuario.apellido,
      },
      viaje: {
        id: ticket.viajeId,
        ruta: ticket.viaje.ruta.nombre,
        origen: ticket.viaje.ruta.origen,
        destino: ticket.viaje.ruta.destino,
      },
    };
  }

  async getAvailability(viajeId: string) {
    const cached = await this.redisService.get(`viaje:availability:${viajeId}`);
    if (cached !== null) return { disponible: Number(cached) };
    const v = await this.ensureViaje(viajeId);
    const available = v.capacidadTotal - v.ocupados;
    await this.redisService.set(`viaje:availability:${viajeId}`, String(available), 60);
    return { disponible: available };
  }

  private combineDateAndTime(date: Date, time: Date) {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        time.getUTCHours(),
        time.getUTCMinutes(),
        time.getUTCSeconds(),
        time.getUTCMilliseconds(),
      ),
    );
  }

  async historyByUsuario(usuarioId: string) {
    const registros = await this.prisma.viajeRegistro.findMany({ where: { usuarioId }, include: { viaje: { include: { ruta: true } } }, orderBy: { creadoEn: 'desc' } });
    return registros;
  }
}
