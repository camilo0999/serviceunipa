import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from 'src/modules/redis/redis.service';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Regla única de elegibilidad (la misma que usa /usuarios/beneficios):
   * 1. El menú existe y está activo.
   * 2. El menú corresponde al día de hoy.
   * 3. El horario del menú no ha finalizado.
   * 4. Alguna materia inscrita del día se cruza realmente con el horario.
   */
  async checkElegibility(usuarioId: string, menuDiaId: string) {
    const menu = await this.prisma.menuDia.findUnique({
      where: { id: menuDiaId },
    });
    if (!menu) throw new NotFoundException('Menú no encontrado');

    if (!menu.activo) {
      throw new ForbiddenException('El menú no está activo');
    }

    const ahora = new Date();
    const hoy = new Date(
      Date.UTC(
        ahora.getUTCFullYear(),
        ahora.getUTCMonth(),
        ahora.getUTCDate(),
      ),
    );

    if (menu.fecha.getTime() !== hoy.getTime()) {
      throw new ForbiddenException('El menú no corresponde al día de hoy');
    }

    const menuInicio = this.combineDateAndTime(menu.fecha, menu.horaInicio);
    const menuFin = this.combineDateAndTime(menu.fecha, menu.horaFin);

    if (menuFin.getTime() <= ahora.getTime()) {
      throw new ForbiddenException('El horario del menú ya finalizó');
    }

    const dayOfWeek = menu.fecha.getUTCDay(); // 0 is Sunday, 1 is Monday

    const inscripciones = await this.prisma.inscripcionMateria.findMany({
      where: {
        usuarioId,
        materia: { diasSemana: { has: dayOfWeek } },
      },
      include: { materia: true },
    });

    const hasOverlap = inscripciones.some((insc) => {
      const materiaInicio = this.combineDateAndTime(
        menu.fecha,
        insc.materia.horaInicio,
      );
      const materiaFin = this.combineDateAndTime(
        menu.fecha,
        insc.materia.horaFin,
      );
      return this.intervalsOverlap(
        menuInicio,
        menuFin,
        materiaInicio,
        materiaFin,
      );
    });

    if (!hasOverlap) {
      throw new ForbiddenException(
        'No cumples con los requisitos de horario para este menú',
      );
    }

    return menu;
  }

  async generateTicket(usuarioId: string, menuDiaId: string) {
    // 1. Elegibilidad
    const menu = await this.checkElegibility(usuarioId, menuDiaId);

    // 2. Anti-duplicado
    const existingTicket = await this.prisma.ticket.findFirst({
      where: { usuarioId, menuDiaId },
    });

    if (existingTicket) {
      throw new ConflictException('Ya has generado un ticket para este menú');
    }

    // 3. Crear Ticket e ID
    const ticketId = randomUUID();
    const expiresInMin = 15;
    const generadoEn = new Date();
    const expiraEn = new Date(generadoEn);
    expiraEn.setMinutes(expiraEn.getMinutes() + expiresInMin);

    // 4. Firmar hash
    const qrHash = this.jwtService.sign(
      {
        ticketId,
        usuarioId,
        menuDiaId,
      },
      { expiresIn: `${expiresInMin}m` },
    );

    try {
      await this.prisma.ticket.create({
        data: {
          id: ticketId,
          usuarioId,
          menuDiaId,
          qrHash,
          usado: false,
          expiraEn,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya has generado un ticket para este menú');
      }
      throw error;
    }

    return {
      id: ticketId,
      menuDiaId: menu.id,
      qrHash,
      estado: 'pendiente',
      generadoEn,
      expiraEn,
      tipoComida: menu.tipoComida,
      detalle: menu.descripcion,
    };
  }

  async validateTicket(qrHash: string) {
    let payload: { ticketId: string };
    try {
      payload = this.jwtService.verify(qrHash);
    } catch {
      throw new UnauthorizedException('Ticket inválido o expirado');
    }

    const { ticketId } = payload;

    // Verificar en Redis para evitar concurrencia
    const redisKey = `ticket:used:${ticketId}`;
    const isUsedRedis = await this.redisService.get(redisKey);
    if (isUsedRedis) {
      throw new ConflictException('Este ticket ya fue utilizado');
    }

    // Lock en Redis
    await this.redisService.set(redisKey, 'true', 3600); // Guardar por 1 hora

    // Verificar en DB
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { usuario: true, menuDia: true },
    });

    if (!ticket) {
      await this.redisService.del(redisKey);
      throw new NotFoundException('Ticket no encontrado en BD');
    }

    if (ticket.usado) {
      throw new ConflictException('Este ticket ya fue utilizado en la BD');
    }

    // Marcar usado
    const usadoEn = new Date();
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { usado: true, usadoEn },
    });

    return {
      success: true,
      mensaje: 'Ticket válido y procesado',
      ticketId: ticket.id,
      estado: 'usado',
      usadoEn,
      usuario: {
        id: ticket.usuario.id,
        nombre: ticket.usuario.nombre,
        apellido: ticket.usuario.apellido,
        codigoEstudiantil: ticket.usuario.codigoEstudiantil,
      },
      menu: {
        id: ticket.menuDia.id,
        tipoComida: ticket.menuDia.tipoComida,
        fecha: ticket.menuDia.fecha,
      },
    };
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

  private intervalsOverlap(
    aStart: Date,
    aEnd: Date,
    bStart: Date,
    bEnd: Date,
  ) {
    return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
  }
}
