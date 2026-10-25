import { ForbiddenException } from '@nestjs/common';
import { TicketsService } from './tickets.service';

const at = (time: string) => new Date(`1970-01-01T${time}Z`);

describe('TicketsService (P1-03)', () => {
  let service: TicketsService;
  let prisma: any;
  let menuBase: any;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-24T12:30:00.000Z')); // sábado

    prisma = {
      menuDia: { findUnique: jest.fn() },
      inscripcionMateria: { findMany: jest.fn() },
      ticket: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    menuBase = {
      id: 'menu-1',
      fecha: new Date('2026-10-24T00:00:00.000Z'),
      tipoComida: 'almuerzo',
      horaInicio: at('12:00:00'),
      horaFin: at('13:00:00'),
      descripcion: 'Almuerzo',
      activo: true,
    };

    service = new TicketsService(
      prisma,
      { sign: jest.fn() } as any,
      { get: jest.fn(), set: jest.fn(), del: jest.fn() } as any,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rechaza un menú inactivo', async () => {
    prisma.menuDia.findUnique.mockResolvedValue({ ...menuBase, activo: false });

    await expect(
      service.checkElegibility('usuario-1', 'menu-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rechaza un menú que no es de hoy', async () => {
    prisma.menuDia.findUnique.mockResolvedValue({
      ...menuBase,
      fecha: new Date('2026-10-23T00:00:00.000Z'),
    });

    await expect(
      service.checkElegibility('usuario-1', 'menu-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rechaza un menú cuyo horario ya finalizó', async () => {
    prisma.menuDia.findUnique.mockResolvedValue({
      ...menuBase,
      horaInicio: at('10:00:00'),
      horaFin: at('11:00:00'),
    });

    await expect(
      service.checkElegibility('usuario-1', 'menu-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('exige que una materia se cruce realmente con el horario del menú', async () => {
    prisma.menuDia.findUnique.mockResolvedValue(menuBase);
    prisma.inscripcionMateria.findMany.mockResolvedValue([
      {
        materia: {
          horaInicio: at('08:00:00'),
          horaFin: at('09:00:00'),
          diasSemana: [6],
        },
      },
    ]);

    await expect(
      service.checkElegibility('usuario-1', 'menu-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('acepta cuando hay cruce real de horario', async () => {
    prisma.menuDia.findUnique.mockResolvedValue(menuBase);
    prisma.inscripcionMateria.findMany.mockResolvedValue([
      {
        materia: {
          horaInicio: at('12:00:00'),
          horaFin: at('14:00:00'),
          diasSemana: [6],
        },
      },
    ]);

    const result = await service.checkElegibility('usuario-1', 'menu-1');
    expect(result.id).toBe('menu-1');
    expect(prisma.inscripcionMateria.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          usuarioId: 'usuario-1',
          materia: { diasSemana: { has: 6 } },
        }),
      }),
    );
  });

  describe('getTicketActivo', () => {
    const ticketBase = {
      id: 'ticket-1',
      usuarioId: 'usuario-1',
      menuDiaId: 'menu-1',
      qrHash: 'hash-firmado',
      usado: false,
      usadoEn: null,
      creadoEn: new Date('2026-10-24T12:00:00.000Z'),
      expiraEn: new Date('2026-10-24T12:45:00.000Z'),
    };

    it('devuelve ticket null cuando el estudiante no ha generado uno', async () => {
      prisma.menuDia.findUnique.mockResolvedValue(menuBase);
      prisma.ticket.findUnique.mockResolvedValue(null);

      const result = await service.getTicketActivo('usuario-1', 'menu-1');

      expect(result).toEqual({ ticket: null });
      expect(prisma.ticket.findUnique).toHaveBeenCalledWith({
        where: {
          usuarioId_menuDiaId: {
            usuarioId: 'usuario-1',
            menuDiaId: 'menu-1',
          },
        },
      });
    });

    it('marca como pendiente un ticket aún vigente', async () => {
      prisma.menuDia.findUnique.mockResolvedValue(menuBase);
      prisma.ticket.findUnique.mockResolvedValue(ticketBase);

      const result = await service.getTicketActivo('usuario-1', 'menu-1');

      expect(result.ticket).toEqual(
        expect.objectContaining({
          id: 'ticket-1',
          qrHash: 'hash-firmado',
          estado: 'pendiente',
          tipoComida: 'almuerzo',
          detalle: 'Almuerzo',
        }),
      );
    });

    it('marca como expirado un ticket cuya vigencia terminó', async () => {
      prisma.menuDia.findUnique.mockResolvedValue(menuBase);
      prisma.ticket.findUnique.mockResolvedValue({
        ...ticketBase,
        expiraEn: new Date('2026-10-24T12:15:00.000Z'),
      });

      const result = await service.getTicketActivo('usuario-1', 'menu-1');

      expect(result.ticket?.estado).toBe('expirado');
    });

    it('marca como usado el ticket aunque su vigencia no haya terminado', async () => {
      prisma.menuDia.findUnique.mockResolvedValue(menuBase);
      prisma.ticket.findUnique.mockResolvedValue({
        ...ticketBase,
        usado: true,
        usadoEn: new Date('2026-10-24T12:10:00.000Z'),
      });

      const result = await service.getTicketActivo('usuario-1', 'menu-1');

      expect(result.ticket?.estado).toBe('usado');
    });

    it('lanza 404 cuando el menú no existe', async () => {
      prisma.menuDia.findUnique.mockResolvedValue(null);

      await expect(
        service.getTicketActivo('usuario-1', 'menu-1'),
      ).rejects.toThrow('Menú no encontrado');
      expect(prisma.ticket.findUnique).not.toHaveBeenCalled();
    });
  });
});
