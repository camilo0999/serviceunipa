import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateMenuDiaDto } from './dto/create-menu-dia.dto';
import { UpdateMenuDiaDto } from './dto/update-menu-dia.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MenusDiaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMenuDiaDto: CreateMenuDiaDto) {
    const existingMenu = await this.prisma.menuDia.findUnique({
      where: {
        fecha_tipoComida: {
          fecha: new Date(createMenuDiaDto.fecha),
          tipoComida: createMenuDiaDto.tipoComida,
        },
      },
    });

    if (existingMenu) {
      throw new ConflictException(
        `Ya existe un menú de ${createMenuDiaDto.tipoComida} para la fecha ${createMenuDiaDto.fecha}`,
      );
    }

    return this.prisma.menuDia.create({
      data: {
        fecha: new Date(createMenuDiaDto.fecha),
        tipoComida: createMenuDiaDto.tipoComida,
        horaInicio: new Date(createMenuDiaDto.horaInicio),
        horaFin: new Date(createMenuDiaDto.horaFin),
        descripcion: createMenuDiaDto.descripcion,
        ...(createMenuDiaDto.url && { url: createMenuDiaDto.url }),
        activo: createMenuDiaDto.activo ?? true,
      },
    });
  }

  /**
   * Lista los menús. Si se recibe `fecha` (YYYY-MM-DD) se filtra por ese día.
   * La fecha se interpreta como fecha de calendario (UTC), igual que la
   * columna `@db.Date` de Prisma.
   */
  async findAll(fecha?: string) {
    const where = fecha ? { fecha: this.parseFecha(fecha) } : undefined;

    return this.prisma.menuDia.findMany({
      ...(where && { where }),
      orderBy: [{ fecha: 'desc' }, { horaInicio: 'asc' }],
    });
  }

  private parseFecha(fecha: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
    if (!match) {
      throw new BadRequestException(
        'La fecha debe tener el formato YYYY-MM-DD',
      );
    }

    const [, year, month, day] = match;
    const parsed = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day)),
    );

    // Rechaza fechas inexistentes (p. ej. 2026-02-31), que Date normaliza.
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== fecha
    ) {
      throw new BadRequestException('La fecha indicada no es válida');
    }

    return parsed;
  }

  async findOne(id: string) {
    const menu = await this.prisma.menuDia.findUnique({
      where: { id },
    });
    if (!menu) {
      throw new NotFoundException(`Menú con ID ${id} no encontrado`);
    }
    return menu;
  }

  async toggleEstado(id: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const menu = await tx.menuDia.findUnique({ where: { id } });
        if (!menu) {
          throw new NotFoundException(
            'Servicio de alimentación no encontrado',
          );
        }

        return tx.menuDia.update({
          where: { id },
          data: { activo: !menu.activo },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async update(id: string, updateMenuDiaDto: UpdateMenuDiaDto) {
    const current = await this.findOne(id); // 404 si no existe

    if (updateMenuDiaDto.fecha || updateMenuDiaDto.tipoComida) {
      const fecha = updateMenuDiaDto.fecha
        ? new Date(updateMenuDiaDto.fecha)
        : current.fecha;
      const tipoComida =
        updateMenuDiaDto.tipoComida ?? current.tipoComida;

      const existingMenu = await this.prisma.menuDia.findFirst({
        where: {
          id: { not: id },
          fecha,
          tipoComida,
        },
      });

      if (existingMenu) {
        throw new ConflictException(
          `Ya existe un menú de ${tipoComida} para esa fecha`,
        );
      }
    }

    return this.prisma.menuDia.update({
      where: { id },
      data: {
        ...(updateMenuDiaDto.fecha && {
          fecha: new Date(updateMenuDiaDto.fecha),
        }),
        ...(updateMenuDiaDto.tipoComida && {
          tipoComida: updateMenuDiaDto.tipoComida,
        }),
        ...(updateMenuDiaDto.horaInicio && {
          horaInicio: new Date(updateMenuDiaDto.horaInicio),
        }),
        ...(updateMenuDiaDto.horaFin && {
          horaFin: new Date(updateMenuDiaDto.horaFin),
        }),
        ...(updateMenuDiaDto.descripcion && {
          descripcion: updateMenuDiaDto.descripcion,
        }),
        ...(updateMenuDiaDto.url !== undefined && {
          url: updateMenuDiaDto.url,
        }),
        ...(updateMenuDiaDto.activo !== undefined && {
          activo: updateMenuDiaDto.activo,
        }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Ensure it exists
    return this.prisma.menuDia.delete({
      where: { id },
    });
  }
}
