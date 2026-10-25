import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Materia, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMateriaDto } from './dto/create-materia.dto';
import { UpdateMateriaDto } from './dto/update-materia.dto';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

@Injectable()
export class MateriasService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista las materias con el número de estudiantes inscritos.
   */
  async findAll() {
    const materias = await this.prisma.materia.findMany({
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { inscripciones: true } } },
    });

    return materias.map((materia) =>
      this.toResponse(materia, materia._count.inscripciones),
    );
  }

  async findOne(id: string) {
    const materia = await this.prisma.materia.findUnique({
      where: { id },
      include: { _count: { select: { inscripciones: true } } },
    });

    if (!materia) {
      throw new NotFoundException('Materia no encontrada.');
    }

    return this.toResponse(materia, materia._count.inscripciones);
  }

  async create(createMateriaDto: CreateMateriaDto) {
    const codigo = createMateriaDto.codigo.trim();
    const nombre = createMateriaDto.nombre.trim();
    const horaInicio = this.parseTime(createMateriaDto.horaInicio);
    const horaFin = this.parseTime(createMateriaDto.horaFin);

    this.assertTimeRange(horaInicio, horaFin);
    await this.assertCodigoDisponible(codigo);

    try {
      const materia = await this.prisma.materia.create({
        data: {
          codigo,
          nombre,
          horaInicio,
          horaFin,
          diasSemana: this.normalizeDays(createMateriaDto.diasSemana),
        },
        include: { _count: { select: { inscripciones: true } } },
      });

      return this.toResponse(materia, materia._count.inscripciones);
    } catch (error) {
      this.rethrowUniqueError(error, codigo);
      throw error;
    }
  }

  async update(id: string, updateMateriaDto: UpdateMateriaDto) {
    const existing = await this.findUniqueOrFail(id);

    const codigo =
      updateMateriaDto.codigo !== undefined
        ? updateMateriaDto.codigo.trim()
        : existing.codigo;

    if (codigo.toLowerCase() !== existing.codigo.toLowerCase()) {
      await this.assertCodigoDisponible(codigo, id);
    }

    const horaInicio =
      updateMateriaDto.horaInicio !== undefined
        ? this.parseTime(updateMateriaDto.horaInicio)
        : existing.horaInicio;
    const horaFin =
      updateMateriaDto.horaFin !== undefined
        ? this.parseTime(updateMateriaDto.horaFin)
        : existing.horaFin;

    this.assertTimeRange(horaInicio, horaFin);

    const data: Prisma.MateriaUncheckedUpdateInput = {
      horaInicio,
      horaFin,
    };

    if (updateMateriaDto.codigo !== undefined) data.codigo = codigo;
    if (updateMateriaDto.nombre !== undefined) {
      data.nombre = updateMateriaDto.nombre.trim();
    }
    if (updateMateriaDto.diasSemana !== undefined) {
      data.diasSemana = this.normalizeDays(updateMateriaDto.diasSemana);
    }

    try {
      const materia = await this.prisma.materia.update({
        where: { id },
        data,
        include: { _count: { select: { inscripciones: true } } },
      });

      return this.toResponse(materia, materia._count.inscripciones);
    } catch (error) {
      this.rethrowUniqueError(error, codigo);
      throw error;
    }
  }

  /**
   * Elimina una materia solo si no tiene inscripciones. La FK está definida
   * con ON DELETE CASCADE, pero borrar el historial académico en silencio no
   * es aceptable: se exige limpiar las inscripciones primero.
   */
  async remove(id: string) {
    const materia = await this.findUniqueOrFail(id);

    return this.prisma.$transaction(async (transaction) => {
      const inscritos = await transaction.inscripcionMateria.count({
        where: { materiaId: id },
      });

      if (inscritos > 0) {
        throw new ConflictException(
          `No se puede eliminar la materia porque tiene ${inscritos} estudiante(s) inscrito(s). Elimina primero las inscripciones.`,
        );
      }

      await transaction.materia.delete({ where: { id } });

      return { id: materia.id, eliminada: true };
    });
  }

  private async findUniqueOrFail(id: string) {
    const materia = await this.prisma.materia.findUnique({ where: { id } });

    if (!materia) {
      throw new NotFoundException('Materia no encontrada.');
    }

    return materia;
  }

  private async assertCodigoDisponible(codigo: string, excludeId?: string) {
    const existing = await this.prisma.materia.findFirst({
      where: {
        codigo: { equals: codigo, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe una materia con el código ${codigo}.`,
      );
    }
  }

  /** Convierte HH:mm a la fecha base 1970-01-01 que usa PostgreSQL TIME. */
  private parseTime(value: string) {
    const match = TIME_PATTERN.exec(value);

    if (!match) {
      throw new BadRequestException('Las horas deben tener formato HH:mm.');
    }

    return new Date(
      Date.UTC(
        1970,
        0,
        1,
        Number(match[1]),
        Number(match[2]),
        match[3] ? Number(match[3]) : 0,
      ),
    );
  }

  private assertTimeRange(horaInicio: Date, horaFin: Date) {
    if (horaFin.getTime() <= horaInicio.getTime()) {
      throw new BadRequestException(
        'La hora de finalización debe ser posterior a la hora de inicio.',
      );
    }
  }

  private normalizeDays(days: number[] | undefined) {
    return [...new Set(days ?? [])].sort((first, second) => first - second);
  }

  private toResponse(materia: Materia, inscritos: number) {
    return {
      id: materia.id,
      codigo: materia.codigo,
      nombre: materia.nombre,
      horaInicio: materia.horaInicio,
      horaFin: materia.horaFin,
      diasSemana: materia.diasSemana ?? [],
      inscritos,
    };
  }

  private rethrowUniqueError(error: unknown, codigo: string) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        `Ya existe una materia con el código ${codigo}.`,
      );
    }
  }
}
