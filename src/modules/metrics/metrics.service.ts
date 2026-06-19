import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  private buildDateRange(start?: string, end?: string) {
    const where: any = {};
    if (start) where.gte = new Date(start);
    if (end) where.lte = new Date(end);
    return where;
  }

  async foodMetrics(start?: string, end?: string) {
    const creadoWhere: any = {};
    const usadoWhere: any = {};
    if (start || end) {
      const range = this.buildDateRange(start, end);
      creadoWhere.creadoEn = range;
      usadoWhere.usadoEn = range;
    }

    const totalTickets = await this.prisma.ticket.count({ where: creadoWhere });
    const usedTickets = await this.prisma.ticket.count({ where: { usado: true, ...(usedadoWhereOrEmpty(usadoWhere)) } });

    // Top foods by generated tickets
    const topByMenu = await this.prisma.ticket.groupBy({
      by: ['menuDiaId'],
      _count: { menuDiaId: true },
      where: creadoWhere,
      orderBy: { _count: { menuDiaId: 'desc' } },
      take: 5,
    });

    const menuIds = topByMenu.map((t) => t.menuDiaId);
    const menus = await this.prisma.menuDia.findMany({ where: { id: { in: menuIds } } });

    const topFoods = topByMenu.map((t) => {
      const menu = menus.find((m) => m.id === t.menuDiaId);
      return {
        menuDiaId: t.menuDiaId,
        tipoComida: menu?.tipoComida || null,
        fecha: menu?.fecha || null,
        descripcion: menu?.descripcion || null,
        tickets: t._count?.menuDiaId ?? 0,
      };
    });

    // Días con más asistencia (tickets usados)
    const usedGroup = await this.prisma.ticket.groupBy({
      by: ['menuDiaId'],
      _count: { menuDiaId: true },
      where: { usado: true, ...(usedadoWhereOrEmpty(usadoWhere)) },
      orderBy: { _count: { menuDiaId: 'desc' } },
      take: 5,
    });
    const usedMenuIds = usedGroup.map((t) => t.menuDiaId);
    const usedMenus = await this.prisma.menuDia.findMany({ where: { id: { in: usedMenuIds } } });

    const busiestDays = usedGroup.map((t) => {
      const menu = usedMenus.find((m) => m.id === t.menuDiaId);
      return {
        menuDiaId: t.menuDiaId,
        fecha: menu?.fecha || null,
        tipoComida: menu?.tipoComida || null,
        asistencia: t._count?.menuDiaId ?? 0,
      };
    });

    return { totalTickets, usedTickets, topFoods, busiestDays };
  }

  async transportMetrics(start?: string, end?: string) {
    const where: any = {};
    if (start || end) {
      if (start) where.gte = new Date(start);
      if (end) where.lte = new Date(end);
    }

    // Filtrar viajes por fecha
    const viajeWhere: any = {};
    if (start || end) viajeWhere.fecha = where;

    // Ocupación promedio por ruta -> promedio de (ocupados / capacidadTotal) aproximado usando promedios
    const routeAgg = await this.prisma.viaje.groupBy({
      by: ['rutaId'],
      _avg: { ocupados: true, capacidadTotal: true },
      where: viajeWhere,
    });

    const ocupacionPromedio = await Promise.all(
      routeAgg.map(async (r) => {
        const ruta = await this.prisma.ruta.findUnique({ where: { id: r.rutaId } });
        const avgOcupados = r._avg?.ocupados ?? 0;
        const avgCap = r._avg?.capacidadTotal ?? 1;
        const porcentaje = avgCap > 0 ? Math.round((avgOcupados / avgCap) * 10000) / 100 : 0;
        return {
          rutaId: r.rutaId,
          nombre: ruta?.nombre || null,
          ocupacionPromedioPercent: porcentaje,
          avgOcupados,
          avgCapacidad: avgCap,
        };
      }),
    );

    // Rutas con más demanda (sumatoria de ocupados)
    const topRoutes = await this.prisma.viaje.groupBy({
      by: ['rutaId'],
      _sum: { ocupados: true },
      where: viajeWhere,
      orderBy: { _sum: { ocupados: 'desc' } },
      take: 5,
    });
    const topRouteIds = topRoutes.map((t) => t.rutaId);
    const routes = await this.prisma.ruta.findMany({ where: { id: { in: topRouteIds } } });
    const routesDemand = topRoutes.map((t) => ({
      rutaId: t.rutaId,
      nombre: routes.find((r) => r.id === t.rutaId)?.nombre || null,
      ocupadosSum: t._sum?.ocupados ?? 0,
    }));

    // Hora pico: agrupar por horarioId y sumar ocupados
    const peakByHorario = await this.prisma.viaje.groupBy({
      by: ['horarioId'],
      _sum: { ocupados: true },
      where: viajeWhere,
      orderBy: { _sum: { ocupados: 'desc' } },
      take: 1,
    });

    let horaPico: any = null;
    if (peakByHorario.length) {
      const hId = peakByHorario[0].horarioId;
      if (hId) {
        const horario = await this.prisma.horario.findUnique({ where: { id: hId } });
        horaPico = {
          horarioId: hId,
          horaPartida: horario?.horaPartida || null,
          ocupadosSum: peakByHorario[0]._sum?.ocupados ?? 0,
          rutaId: horario?.rutaId || null,
        };
      }
    }

    return { ocupacionPromedio, routesDemand, horaPico };
  }
}

function usedadoWhereOrEmpty(obj: any) {
  return Object.keys(obj).length ? obj : undefined;
}
