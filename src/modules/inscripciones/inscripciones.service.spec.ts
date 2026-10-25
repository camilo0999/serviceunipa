import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RolUsuario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InscripcionesService } from './inscripciones.service';

const buildPrismaMock = () => ({
  usuario: {
    findUnique: jest.fn(),
  },
  materia: {
    findUnique: jest.fn(),
  },
  inscripcionMateria: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
});

const estudiante = {
  id: 'usuario-1',
  codigoEstudiantil: '20240001',
  nombre: 'Ana',
  apellido: 'Pérez',
  email: 'ana@unipacifico.edu.co',
  rol: RolUsuario.estudiante,
  activo: true,
};

const materia = {
  id: 'materia-1',
  codigo: 'MAT-101',
  nombre: 'Cálculo diferencial',
  horaInicio: new Date('1970-01-01T07:00:00.000Z'),
  horaFin: new Date('1970-01-01T09:00:00.000Z'),
  diasSemana: [1, 3],
};

const inscripcion = {
  id: 'inscripcion-1',
  usuarioId: estudiante.id,
  materiaId: materia.id,
  semestre: '2026-1',
  usuario: estudiante,
  materia,
};

describe('InscripcionesService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: InscripcionesService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new InscripcionesService(prisma as unknown as PrismaService);
  });

  it('lista inscripciones con filtros y búsqueda', async () => {
    prisma.inscripcionMateria.findMany.mockResolvedValue([inscripcion]);

    const result = await service.findAll({
      usuarioId: estudiante.id,
      semestre: '2026-1',
      search: 'ana',
    });

    expect(result).toEqual([inscripcion]);
    expect(prisma.inscripcionMateria.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          usuarioId: estudiante.id,
          semestre: '2026-1',
          OR: expect.any(Array),
        }),
        include: expect.any(Object),
      }),
    );
  });

  it('lista todas las inscripciones sin filtros', async () => {
    prisma.inscripcionMateria.findMany.mockResolvedValue([inscripcion]);

    await service.findAll();

    expect(prisma.inscripcionMateria.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('inscribe una materia a un estudiante', async () => {
    prisma.usuario.findUnique.mockResolvedValue(estudiante);
    prisma.materia.findUnique.mockResolvedValue(materia);
    prisma.inscripcionMateria.create.mockResolvedValue(inscripcion);

    const result = await service.create({
      usuarioId: estudiante.id,
      materiaId: materia.id,
      semestre: '  2026-1  ',
    });

    expect(prisma.inscripcionMateria.create).toHaveBeenCalledWith({
      data: {
        usuarioId: estudiante.id,
        materiaId: materia.id,
        semestre: '2026-1',
      },
      include: expect.any(Object),
    });
    expect(result).toEqual(inscripcion);
  });

  it('rechaza inscribir a un usuario que no es estudiante', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      ...estudiante,
      rol: RolUsuario.administrador,
    });
    prisma.materia.findUnique.mockResolvedValue(materia);

    await expect(
      service.create({
        usuarioId: estudiante.id,
        materiaId: materia.id,
        semestre: '2026-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.inscripcionMateria.create).not.toHaveBeenCalled();
  });

  it('devuelve 404 cuando el usuario no existe', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);
    prisma.materia.findUnique.mockResolvedValue(materia);

    await expect(
      service.create({
        usuarioId: 'usuario-inexistente',
        materiaId: materia.id,
        semestre: '2026-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('devuelve 404 cuando la materia no existe', async () => {
    prisma.usuario.findUnique.mockResolvedValue(estudiante);
    prisma.materia.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        usuarioId: estudiante.id,
        materiaId: 'materia-inexistente',
        semestre: '2026-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('devuelve 409 cuando la inscripción ya existe', async () => {
    prisma.usuario.findUnique.mockResolvedValue(estudiante);
    prisma.materia.findUnique.mockResolvedValue(materia);
    prisma.inscripcionMateria.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicado', {
        code: 'P2002',
        clientVersion: '5.22.0',
      }),
    );

    await expect(
      service.create({
        usuarioId: estudiante.id,
        materiaId: materia.id,
        semestre: '2026-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('devuelve una inscripción por ID', async () => {
    prisma.inscripcionMateria.findUnique.mockResolvedValue(inscripcion);

    await expect(service.findOne(inscripcion.id)).resolves.toEqual(inscripcion);
  });

  it('devuelve 404 cuando la inscripción no existe', async () => {
    prisma.inscripcionMateria.findUnique.mockResolvedValue(null);

    await expect(service.findOne('inscripcion-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('elimina una inscripción existente', async () => {
    prisma.inscripcionMateria.findUnique.mockResolvedValue({
      id: inscripcion.id,
    });
    prisma.inscripcionMateria.delete.mockResolvedValue(inscripcion);

    const result = await service.remove(inscripcion.id);

    expect(prisma.inscripcionMateria.delete).toHaveBeenCalledWith({
      where: { id: inscripcion.id },
    });
    expect(result).toEqual({ id: inscripcion.id, eliminada: true });
  });

  it('devuelve 404 al eliminar una inscripción inexistente', async () => {
    prisma.inscripcionMateria.findUnique.mockResolvedValue(null);

    await expect(service.remove('inscripcion-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.inscripcionMateria.delete).not.toHaveBeenCalled();
  });
});
