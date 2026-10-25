import { RolUsuario } from '@prisma/client';
import { ImportService } from './import.service';

const buildPrismaMock = () => ({
  usuario: {
    findUnique: jest.fn(),
  },
  materia: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  inscripcionMateria: {
    upsert: jest.fn(),
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
});
