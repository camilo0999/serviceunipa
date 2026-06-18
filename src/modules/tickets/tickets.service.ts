import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
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

  async checkElegibility(usuarioId: string, menuDiaId: string) {
    const menu = await this.prisma.menuDia.findUnique({
      where: { id: menuDiaId },
    });
    if (!menu) throw new NotFoundException('Menú no encontrado');

    const dayOfWeek = menu.fecha.getUTCDay(); // 0 is Sunday, 1 is Monday

    // Verificar si tiene materias inscritas para este día que crucen con el horario
    const inscripciones = await this.prisma.inscripcionMateria.findMany({
      where: { usuarioId },
      include: { materia: true },
    });

    const hasClass = inscripciones.some((insc) => {
      if (!insc.materia.diasSemana.includes(dayOfWeek)) return false;

      // Un estudiante es elegible si el horario de la comida cruza con el de la clase,
      // o típicamente si tiene clases en ese día. La regla exacta de cruce horario:
      // menuInicio < materiaFin && menuFin > materiaInicio (hay superposición)
      // Pero usualmente se quiere que almuercen ANTES o DESPUÉS, pero aceptemos "tiene clase ese día".
      return true; // Simplified for now, or implement exact logic
    });

    if (!hasClass) {
      throw new ForbiddenException(
        'No cumples con los requisitos de horario para este menú',
      );
    }

    return menu;
  }

  async generateTicket(usuarioId: string, menuDiaId: string) {
    // 1. Elegibilidad
    await this.checkElegibility(usuarioId, menuDiaId);

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
    const expiraEn = new Date();
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

    return {
      qrHash,
      expiraEn,
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
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { usado: true, usadoEn: new Date() },
    });

    return {
      success: true,
      mensaje: 'Ticket válido y procesado',
      usuario: {
        nombre: ticket.usuario.nombre,
        apellido: ticket.usuario.apellido,
      },
      menu: ticket.menuDia.tipoComida,
    };
  }
}
