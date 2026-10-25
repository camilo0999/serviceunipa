import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { MateriasService } from './materias.service';

const buildPrismaMock = () => {
  const prisma: any = {
    materia: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    inscripcionMateria: {
      count: jest.fn(),
    },
  };

  prisma.$transaction = jest.fn(async (callback: (tx: any) => unknown) =>
    callback(prisma),
  );

  return prisma;
};

const storedMateria = {
  id: 'materia-1',
  codigo: 'MAT-101',
  nombre: 'Cálculo diferencial',
  horaInicio: new Date('1970-01-01T07:00:00.000Z'),
  horaFin: new Date('1970-01-01T09:00:00.000Z'),
  diasSemana: [1, 3],
};

describe('MateriasService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: MateriasService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new MateriasService(prisma);
  });

  it('lista las materias con el número de inscritos', async () => {
    prisma.materia.findMany.mockResolvedValue([
      { ...storedMateria, _count: { inscripciones: 42 } },
    ]);

    const result = await service.findAll();

    expect(result).toEqual([{ ...storedMateria, inscritos: 42 }]);
    expect(result[0]).not.toHaveProperty('_count');
  });

  it('normaliza a [] los días nulos que pueda devolver la base', async () => {
    prisma.materia.findMany.mockResolvedValue([
      { ...storedMateria, diasSemana: null, _count: { inscripciones: 0 } },
    ]);

    const [materia] = await service.findAll();

    expect(materia.diasSemana).toEqual([]);
  });

  it('crea una materia con horas y días normalizados', async () => {
    prisma.materia.findFirst.mockResolvedValue(null);
    prisma.materia.create.mockResolvedValue({
      ...storedMateria,
      codigo: 'MAT-102',
      _count: { inscripciones: 0 },
    });

    const result = await service.create({
      codigo: '  MAT-102  ',
      nombre: '  Álgebra lineal  ',
      horaInicio: '07:00',
      horaFin: '09:00',
      diasSemana: [3, 1, 3],
    });

    expect(prisma.materia.create).toHaveBeenCalledWith({
      data: {
        codigo: 'MAT-102',
        nombre: 'Álgebra lineal',
        horaInicio: new Date('1970-01-01T07:00:00.000Z'),
        horaFin: new Date('1970-01-01T09:00:00.000Z'),
        diasSemana: [1, 3],
      },
      include: { _count: { select: { inscripciones: true } } },
    });
    expect(result).toEqual({
      ...storedMateria,
      codigo: 'MAT-102',
      inscritos: 0,
    });
  });

  it('rechaza un código duplicado sin distinguir mayúsculas', async () => {
    prisma.materia.findFirst.mockResolvedValue({ id: 'otra-materia' });

    await expect(
      service.create({
        codigo: 'mat-101',
        nombre: 'Otra materia',
        horaInicio: '07:00',
        horaFin: '09:00',
        diasSemana: [1],
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.materia.create).not.toHaveBeenCalled();
  });

  it('rechaza una hora de fin anterior o igual a la de inicio', async () => {
    await expect(
      service.create({
        codigo: 'MAT-103',
        nombre: 'Física',
        horaInicio: '09:00',
        horaFin: '08:00',
        diasSemana: [2],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('actualiza solo los campos enviados', async () => {
    prisma.materia.findUnique.mockResolvedValue(storedMateria);
    prisma.materia.update.mockResolvedValue({
      ...storedMateria,
      nombre: 'Cálculo integral',
      horaFin: new Date('1970-01-01T10:00:00.000Z'),
      diasSemana: [2, 4],
      _count: { inscripciones: 5 },
    });

    const result = await service.update('materia-1', {
      nombre: 'Cálculo integral',
      horaFin: '10:00',
      diasSemana: [4, 2, 4],
    });

    expect(prisma.materia.update).toHaveBeenCalledWith({
      where: { id: 'materia-1' },
      data: {
        horaInicio: storedMateria.horaInicio,
        horaFin: new Date('1970-01-01T10:00:00.000Z'),
        nombre: 'Cálculo integral',
        diasSemana: [2, 4],
      },
      include: { _count: { select: { inscripciones: true } } },
    });
    expect(result.nombre).toBe('Cálculo integral');
    expect(result.inscritos).toBe(5);
  });

  it('impide mover el fin antes del inicio al actualizar', async () => {
    prisma.materia.findUnique.mockResolvedValue(storedMateria);

    await expect(
      service.update('materia-1', { horaFin: '06:00' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('devuelve 404 cuando la materia no existe', async () => {
    prisma.materia.findUnique.mockResolvedValue(null);

    await expect(service.findOne('materia-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('impide eliminar una materia con estudiantes inscritos', async () => {
    prisma.materia.findUnique.mockResolvedValue(storedMateria);
    prisma.inscripcionMateria.count.mockResolvedValue(3);

    await expect(service.remove('materia-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.materia.delete).not.toHaveBeenCalled();
  });

  it('elimina una materia sin inscripciones', async () => {
    prisma.materia.findUnique.mockResolvedValue(storedMateria);
    prisma.inscripcionMateria.count.mockResolvedValue(0);
    prisma.materia.delete.mockResolvedValue(storedMateria);

    const result = await service.remove('materia-1');

    expect(prisma.materia.delete).toHaveBeenCalledWith({
      where: { id: 'materia-1' },
    });
    expect(result).toEqual({ id: 'materia-1', eliminada: true });
  });
});
