import { BadRequestException } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { ImportService } from './import.service';

const buildPrismaMock = () => ({
  usuario: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  materia: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  inscripcionMateria: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    createMany: jest.fn(),
  },
});

const scheduleRecord = {
  codigoEstudiantil: '201234',
  materiaCodigo: 'MAT-101',
  materiaNombre: 'Matemáticas',
  semestre: '2026-1',
};

describe('ImportService', () => {
  it('parses CSV with headers', () => {
    const service = new ImportService({} as any);
    const csv =
      'codigoEstudiantil,materiaNombre,semestre\n201234,mate1,2026-1\n';
    const buf = Buffer.from(csv, 'utf8');

    const records = service.parseCsv(buf);

    expect(records).toHaveLength(1);
    expect(records[0].codigoEstudiantil).toBe('201234');
  });

  it('omite usuarios que no tienen rol estudiante', async () => {
    const prisma = buildPrismaMock();
    prisma.usuario.findUnique.mockResolvedValue({
      id: 'usuario-1',
      rol: RolUsuario.administrador,
    });
    const service = new ImportService(prisma as any);

    const result = await service.importSchedules([scheduleRecord]);

    expect(result.inserted).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.errors[0].reason).toBe('usuario_no_estudiante');
    expect(prisma.materia.findUnique).not.toHaveBeenCalled();
    expect(prisma.inscripcionMateria.upsert).not.toHaveBeenCalled();
  });

  it('inscribe la materia cuando el usuario es estudiante', async () => {
    const prisma = buildPrismaMock();
    prisma.usuario.findUnique.mockResolvedValue({
      id: 'usuario-1',
      rol: RolUsuario.estudiante,
    });
    prisma.materia.findUnique.mockResolvedValue({ id: 'materia-1' });
    prisma.inscripcionMateria.upsert.mockResolvedValue({});
    const service = new ImportService(prisma as any);

    const result = await service.importSchedules([scheduleRecord]);

    expect(result.inserted).toBe(1);
    expect(result.skipped).toBe(0);
    expect(prisma.inscripcionMateria.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          usuarioId: 'usuario-1',
          materiaId: 'materia-1',
          semestre: '2026-1',
        },
      }),
    );
  });

  it('parsea CSV de inscripciones con BOM, punto y coma y alias', () => {
    const service = new ImportService({} as any);
    const contenido =
      '\uFEFFcodigo_estudiantil;materia_codigo;semestre\n201234;MAT-101;2026-1\n';

    const records = service.parseEnrollmentCsv(Buffer.from(contenido, 'utf8'));

    expect(records).toEqual([
      {
        codigoEstudiantil: '201234',
        materiaCodigo: 'MAT-101',
        semestre: '2026-1',
      },
    ]);
  });

  it('rechaza CSV de inscripciones sin las columnas obligatorias', () => {
    const service = new ImportService({} as any);
    const contenido = 'codigoEstudiantil,semestre\n201234,2026-1\n';

    expect(() =>
      service.parseEnrollmentCsv(Buffer.from(contenido, 'utf8')),
    ).toThrow(BadRequestException);
  });

  it('importa solo inscripciones válidas y reporta cada omisión', async () => {
    const prisma = buildPrismaMock();
    prisma.usuario.findMany.mockResolvedValue([
      {
        id: 'usuario-1',
        codigoEstudiantil: '201234',
        rol: RolUsuario.estudiante,
      },
      {
        id: 'usuario-2',
        codigoEstudiantil: 'ADMIN1',
        rol: RolUsuario.administrador,
      },
    ]);
    prisma.materia.findMany.mockResolvedValue([
      { id: 'materia-1', codigo: 'MAT-101' },
      { id: 'materia-2', codigo: 'MAT-102' },
    ]);
    prisma.inscripcionMateria.findMany.mockResolvedValue([
      { usuarioId: 'usuario-1', materiaId: 'materia-2', semestre: '2026-1' },
    ]);
    prisma.inscripcionMateria.createMany.mockResolvedValue({ count: 1 });
    const service = new ImportService(prisma as any);

    const result = await service.importEnrollments([
      {
        codigoEstudiantil: '201234',
        materiaCodigo: 'MAT-101',
        semestre: '2026-1',
      },
      {
        codigoEstudiantil: '201234',
        materiaCodigo: 'MAT-101',
        semestre: '2026-1',
      },
      {
        codigoEstudiantil: '201234',
        materiaCodigo: 'MAT-102',
        semestre: '2026-1',
      },
      {
        codigoEstudiantil: '999999',
        materiaCodigo: 'MAT-101',
        semestre: '2026-1',
      },
      {
        codigoEstudiantil: 'ADMIN1',
        materiaCodigo: 'MAT-101',
        semestre: '2026-1',
      },
      {
        codigoEstudiantil: '201234',
        materiaCodigo: 'NO-EXISTE',
        semestre: '2026-1',
      },
    ]);

    expect(result.total).toBe(6);
    expect(result.inserted).toBe(1);
    expect(result.skipped).toBe(5);
    expect(result.errors.map((error) => error.reason)).toEqual([
      'inscripcion_duplicada',
      'inscripcion_duplicada',
      'estudiante_no_encontrado',
      'usuario_no_estudiante',
      'materia_no_encontrada',
    ]);
    expect(prisma.inscripcionMateria.createMany).toHaveBeenCalledWith({
      data: [
        {
          usuarioId: 'usuario-1',
          materiaId: 'materia-1',
          semestre: '2026-1',
        },
      ],
      skipDuplicates: true,
    });
  });

  it('omite registros con datos incompletos sin consultar la base', async () => {
    const prisma = buildPrismaMock();
    const service = new ImportService(prisma as any);

    const result = await service.importEnrollments([
      { codigoEstudiantil: '', materiaCodigo: 'MAT-101', semestre: '2026-1' },
    ]);

    expect(result.total).toBe(1);
    expect(result.inserted).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.errors[0].reason).toBe('datos_incompletos');
    expect(prisma.usuario.findMany).not.toHaveBeenCalled();
    expect(prisma.inscripcionMateria.createMany).not.toHaveBeenCalled();
  });
});
