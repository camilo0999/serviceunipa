import { BadRequestException } from '@nestjs/common';
import { MenusDiaService } from './menus-dia.service';

describe('MenusDiaService (filtro por fecha)', () => {
  let service: MenusDiaService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      menuDia: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new MenusDiaService(prisma);
  });

  it('lista todos los menús cuando no se indica fecha', async () => {
    await service.findAll();

    expect(prisma.menuDia.findMany).toHaveBeenCalledWith({
      orderBy: [{ fecha: 'desc' }, { horaInicio: 'asc' }],
    });
  });

  it('filtra por la fecha indicada en formato YYYY-MM-DD', async () => {
    await service.findAll('2026-10-25');

    expect(prisma.menuDia.findMany).toHaveBeenCalledWith({
      where: { fecha: new Date('2026-10-25T00:00:00.000Z') },
      orderBy: [{ fecha: 'desc' }, { horaInicio: 'asc' }],
    });
  });

  it.each(['25-10-2026', '2026-13-01', '2026-02-31', 'hoy'])(
    'rechaza la fecha inválida "%s"',
    async (fecha) => {
      await expect(service.findAll(fecha)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.menuDia.findMany).not.toHaveBeenCalled();
    },
  );
});
