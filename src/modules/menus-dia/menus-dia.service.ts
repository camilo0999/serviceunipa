import {
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

  findAll() {
    return this.prisma.menuDia.findMany({
      orderBy: [{ fecha: 'desc' }, { horaInicio: 'asc' }],
    });
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
    await this.findOne(id); // Ensure it exists

    if (updateMenuDiaDto.fecha || updateMenuDiaDto.tipoComida) {
      const existingMenu = await this.prisma.menuDia.findFirst({
        where: {
          id: { not: id },
          fecha: updateMenuDiaDto.fecha
            ? new Date(updateMenuDiaDto.fecha)
            : undefined,
          tipoComida: updateMenuDiaDto.tipoComida,
        },
      });

      if (existingMenu) {
        throw new ConflictException(
          `Ya existe un menú de ${updateMenuDiaDto.tipoComida || existingMenu.tipoComida} para esa fecha`,
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
