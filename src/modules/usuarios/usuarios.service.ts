import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import * as bcrypt from 'bcrypt';

/** Campos seguros: nunca incluye passwordHash. */
const USUARIO_PUBLIC_SELECT = {
  id: true,
  codigoEstudiantil: true,
  nombre: true,
  apellido: true,
  email: true,
  rol: true,
  turno: true,
  activo: true,
  fotoUrl: true,
  creadoEn: true,
  actualizadoEn: true,
} as const;

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    const { password, ...rest } = createUsuarioDto;
    const hashed = await bcrypt.hash(password, 12);

    return this.prisma.usuario.create({
      data: {
        ...rest,
        passwordHash: hashed,
      },
      select: USUARIO_PUBLIC_SELECT,
    });
  }

  async findAll() {
    return this.prisma.usuario.findMany({
      select: USUARIO_PUBLIC_SELECT,
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      select: USUARIO_PUBLIC_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  async getBeneficios(usuarioId: string) {
    const ahora = new Date();
    const hoy = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
    const dayOfWeek = hoy.getUTCDay();

    const menusHoy = await this.prisma.menuDia.findMany({
      where: { activo: true, fecha: hoy },
      orderBy: [{ horaInicio: 'asc' }],
    });

    const inscripcionesHoy = await this.prisma.inscripcionMateria.findMany({
      where: {
        usuarioId,
        materia: {
          diasSemana: { has: dayOfWeek },
        },
      },
      include: { materia: true },
    });

    const menus = menusHoy.map((menu) => {
      const inicio = this.combineDateAndTime(menu.fecha, menu.horaInicio);
      const fin = this.combineDateAndTime(menu.fecha, menu.horaFin);

      const disponible = inscripcionesHoy.some((insc) => {
        const materiaInicio = this.combineDateAndTime(
          menu.fecha,
          insc.materia.horaInicio,
        );
        const materiaFin = this.combineDateAndTime(menu.fecha, insc.materia.horaFin);
        return this.intervalsOverlap(inicio, fin, materiaInicio, materiaFin);
      });

      return {
        menuDiaId: menu.id,
        tipoComida: menu.tipoComida,
        descripcion: menu.descripcion,
        horaInicio: inicio,
        horaFin: fin,
        disponible,
        mensaje: disponible
          ? 'Puedes acceder a este beneficio de comida hoy.'
          : 'No hay clases que crucen con este horario de comida hoy.',
      };
    });

    const busesHoy = await this.getBusesHoy(hoy, ahora);
    const busDisponible = busesHoy.length > 0;
    const elegibilidad = {
      menus,
      bus: {
        disponible: busDisponible,
        mensaje: busDisponible
          ? 'Hay viajes de bus disponibles hoy.'
          : 'No hay viajes de bus disponibles hoy.',
      },
    };

    const proximoServicio = this.findNearestService(menus, busesHoy, ahora);

    return {
      elegibilidad,
      proximoServicio,
    };
  }

  async getHorario(usuarioId: string) {
    const inscripciones = await this.prisma.inscripcionMateria.findMany({
      where: { usuarioId },
      select: {
        id: true,
        usuarioId: true,
        semestre: true,
        materia: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            horaInicio: true,
            horaFin: true,
            diasSemana: true,
          },
        },
      },
      orderBy: [{ semestre: 'asc' }, { materia: { nombre: 'asc' } }],
    });

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    return inscripciones.map((inscripcion) => ({
      usuarioId: inscripcion.usuarioId,
      inscripcionId: inscripcion.id,
      semestre: inscripcion.semestre,
      materiaId: inscripcion.materia.id,
      codigo: inscripcion.materia.codigo,
      nombre: inscripcion.materia.nombre,
      horaInicio: this.formatTime(inscripcion.materia.horaInicio),
      horaFin: this.formatTime(inscripcion.materia.horaFin),
      diasSemana: inscripcion.materia.diasSemana,
      dias: inscripcion.materia.diasSemana.map((d) => dayNames[d] ?? String(d)),
    }));
  }

  private formatTime(time: Date) {
    if (!time) return null;
    const hours = String(time.getUTCHours()).padStart(2, '0');
    const minutes = String(time.getUTCMinutes()).padStart(2, '0');
    const seconds = String(time.getUTCSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  private async getBusesHoy(hoy: Date, ahora: Date) {
    const rutas = await this.prisma.ruta.findMany({
      where: {
        activo: true,
        OR: [{ horaSalida: { not: null } }, { horarios: { some: {} } }],
      },
      include: { horarios: true },
    });

    const busesPorRuta = await Promise.all(
      rutas.map(async (ruta: any) => {
        const horas = [] as Array<{ id: string | null; horaPartida: Date }>;

        if (ruta.horaSalida) {
          horas.push({ id: null, horaPartida: ruta.horaSalida });
        }

        for (const horario of ruta.horarios ?? []) {
          horas.push({ id: horario.id, horaPartida: horario.horaPartida });
        }

        const buses = await Promise.all(
          horas.map(async (horario) => {
            const departure = this.combineDateAndTime(hoy, horario.horaPartida);
            if (!departure || departure.getTime() <= ahora.getTime()) return null;

            const viaje = await this.prisma.viaje.findFirst({
              where: {
                rutaId: ruta.id,
                fecha: hoy,
                ...(horario.id ? { horarioId: horario.id } : { horarioId: null }),
              },
            });

            const capacidad = viaje?.capacidadTotal ?? ruta.capacidadTotal;
            const disponible = Math.max(0, capacidad - (viaje?.ocupados ?? 0));
            if (disponible <= 0) return null;

            return {
              viajeId: viaje?.id ?? ruta.id,
              rutaNombre: ruta.nombre,
              origen: ruta.origen,
              destino: ruta.destino,
              departure,
              disponible,
            };
          }),
        );

        return buses.filter(Boolean);
      }),
    );

    return busesPorRuta
      .flat()
      .filter((viaje): viaje is {
        viajeId: string;
        rutaNombre: string;
        origen: string;
        destino: string;
        departure: Date;
        disponible: number;
      } => Boolean(viaje))
      .sort((a, b) => a.departure.getTime() - b.departure.getTime());
  }

  private getViajeDeparture(viaje: any, hoy: Date) {
    if (viaje.horario?.horaPartida) {
      const fechaBase = viaje.fecha ? viaje.fecha : hoy;
      return this.combineDateAndTime(fechaBase, viaje.horario.horaPartida);
    }

    if (viaje.fecha && viaje.ruta?.horaSalida) {
      return this.combineDateAndTime(viaje.fecha, viaje.ruta.horaSalida);
    }

    if (viaje.ruta?.horaSalida) {
      return this.combineDateAndTime(hoy, viaje.ruta.horaSalida);
    }

    return null;
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

  private intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
    return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
  }

  private findNearestService(menus: any[], buses: any[], ahora: Date) {
    const servicios = [] as Array<any>;

    for (const menu of menus) {
      const deadline = menu.horaFin;
      if (deadline.getTime() > ahora.getTime()) {
        servicios.push({
          tipo: 'comida',
          nombre: String(menu.tipoComida),
          descripcion: menu.descripcion,
          deadline,
          horaInicio: menu.horaInicio,
          horaFin: menu.horaFin,
          disponible: menu.disponible,
        });
      }
    }

    for (const bus of buses) {
      servicios.push({
        tipo: 'bus',
        nombre: bus.rutaNombre,
        origen: bus.origen,
        destino: bus.destino,
        deadline: bus.departure,
        disponible: true,
        asientosDisponibles: bus.disponible,
      });
    }

    if (!servicios.length) return null;

    const proximo = servicios.sort(
      (a, b) => a.deadline.getTime() - b.deadline.getTime(),
    )[0];
    const countdownMs = Math.max(0, proximo.deadline.getTime() - ahora.getTime());

    return {
      ...proximo,
      countdownSegundos: Math.floor(countdownMs / 1000),
    };
  }

  async update(id: string, updateUsuarioDto: UpdateUsuarioDto) {
    const { password, ...rest } = updateUsuarioDto;
    const data: any = { ...rest };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 12);
    }
    return this.prisma.usuario.update({
      where: { id },
      data,
      select: USUARIO_PUBLIC_SELECT,
    });
  }

  /**
   * Actualización de autoservicio: únicamente campos de perfil.
   * Rol, turno, estado, correo, código y contraseña quedan fuera.
   */
  async updatePerfil(id: string, updatePerfilDto: UpdatePerfilDto) {
    return this.prisma.usuario.update({
      where: { id },
      data: {
        nombre: updatePerfilDto.nombre,
        apellido: updatePerfilDto.apellido,
        fotoUrl: updatePerfilDto.fotoUrl,
      },
      select: USUARIO_PUBLIC_SELECT,
    });
  }

  async remove(id: string) {
    return this.prisma.usuario.delete({
      where: { id },
      select: USUARIO_PUBLIC_SELECT,
    });
  }
}
