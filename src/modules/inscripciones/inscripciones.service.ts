import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RolUsuario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInscripcionDto } from './dto/create-inscripcion.dto';
import { ListInscripcionesQueryDto } from './dto/list-inscripciones-query.dto';

const USUARIO_SELECT: Prisma.UsuarioSelect = {
  id: true,
  codigoEstudiantil: true,
  nombre: true,
  apellido: true,
  email: true,
  rol: true,
  activo: true,
};

const MATERIA_SELECT: Prisma.MateriaSelect = {
  id: true,
  codigo: true,
  nombre: true,
  horaInicio: true,
  horaFin: true,
  diasSemana: true,
};

const INSCRIPCION_INCLUDE: Prisma.InscripcionMateriaInclude = {
  usuario: { select: USUARIO_SELECT },
  materia: { select: MATERIA_SELECT },
};

@Injectable()
export class InscripcionesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista las inscripciones con los datos del estudiante y de la materia.
   * Admite filtros por estudiante, materia, semestre y búsqueda de texto.
   */
  async findAll(query: ListInscripcionesQueryDto = {}) {
    const where: Prisma.InscripcionMateriaWhereInput = {};

    if (query.usuarioId) where.usuarioId = query.usuarioId;
    if (query.materiaId) where.materiaId = query.materiaId;
    if (query.semestre) where.semestre = query.semestre;

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        {
          usuario: {
            codigoEstudiantil: { contains: search, mode: 'insensitive' },
          },
        },
        { usuario: { nombre: { contains: search, mode: 'insensitive' } } },
        { usuario: { apellido: { contains: search, mode: 'insensitive' } } },
        { usuario: { email: { contains: search, mode: 'insensitive' } } },
        { materia: { codigo: { contains: search, mode: 'insensitive' } } },
        { materia: { nombre: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.inscripcionMateria.findMany({
      where,
      include: INSCRIPCION_INCLUDE,
      orderBy: [
        { semestre: 'desc' },
        { usuario: { apellido: 'asc' } },
        { usuario: { nombre: 'asc' } },
        { materia: { nombre: 'asc' } },
      ],
    });
  }

  async findOne(id: string) {
    const inscripcion = await this.prisma.inscripcionMateria.findUnique({
      where: { id },
      include: INSCRIPCION_INCLUDE,
    });

    if (!inscripcion) {
      throw new NotFoundException('Inscripción no encontrada.');
    }

    return inscripcion;
  }

  /**
   * Inscribe una materia a un usuario. Solo se admiten usuarios con rol
   * estudiante, tal como exige la naturaleza académica del registro.
   */
  async create(createInscripcionDto: CreateInscripcionDto) {
    const { usuarioId, materiaId } = createInscripcionDto;
    const semestre = createInscripcionDto.semestre.trim();

    const [usuario, materia] = await Promise.all([
      this.prisma.usuario.findUnique({ where: { id: usuarioId } }),
      this.prisma.materia.findUnique({ where: { id: materiaId } }),
    ]);

    if (!usuario) {
      throw new NotFoundException('No existe un usuario con el ID indicado.');
    }

    if (usuario.rol !== RolUsuario.estudiante) {
      throw new BadRequestException(
        'Solo se pueden inscribir usuarios con rol estudiante.',
      );
    }

    if (!materia) {
      throw new NotFoundException('No existe una materia con el ID indicado.');
    }

    try {
      return await this.prisma.inscripcionMateria.create({
        data: { usuarioId, materiaId, semestre },
        include: INSCRIPCION_INCLUDE,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'El estudiante ya está inscrito en esta materia para el semestre indicado.',
        );
      }
      throw error;
    }
  }

  async remove(id: string) {
    const inscripcion = await this.prisma.inscripcionMateria.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!inscripcion) {
      throw new NotFoundException('Inscripción no encontrada.');
    }

    await this.prisma.inscripcionMateria.delete({ where: { id } });

    return { id: inscripcion.id, eliminada: true };
  }
}
