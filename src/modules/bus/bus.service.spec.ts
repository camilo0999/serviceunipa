import { ConflictException, NotFoundException } from '@nestjs/common';
import { BusService } from './bus.service';

describe('BusService (P1-01)', () => {
  let service: BusService;
  let prisma: any;
  let jwt: any;
  let redis: any;

  const viaje = {
    id: 'viaje-1',
    rutaId: 'ruta-1',
    horarioId: null,
    capacidadTotal: 40,
    ocupados: 3,
    fecha: new Date('2026-10-24T00:00:00Z'),
    ruta: {
      id: 'ruta-1',
      nombre: 'Ruta principal',
      origen: 'Campus',
      destino: 'Terminal',
      horaSalida: new Date('1970-01-01T18:00:00Z'),
    },
    horario: null,
  };

  beforeEach(() => {
    prisma = {
      busTicket: { findFirst: jest.fn(), create: jest.fn() },
      viaje: { findUnique: jest.fn() },
    };
    jwt = { sign: jest.fn().mockReturnValue('qr-firmado') };
    redis = { set: jest.fn() };

    service = new BusService(prisma, jwt, redis);
  });

  it('rechaza un id que no corresponde a un viaje real', async () => {
    prisma.viaje.findUnique.mockResolvedValue(null);

    await expect(service.generateTicket('usuario-1', 'ruta-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.busTicket.create).not.toHaveBeenCalled();
  });

  it('persiste y responde el id real del viaje', async () => {
    prisma.viaje.findUnique.mockResolvedValue(viaje);
    prisma.busTicket.findFirst.mockResolvedValue(null);
    prisma.busTicket.create.mockResolvedValue({});

    const result = await service.generateTicket('usuario-1', 'viaje-1');

    expect(prisma.busTicket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        usuarioId: 'usuario-1',
        viajeId: 'viaje-1',
      }),
    });
    expect(result.viajeId).toBe('viaje-1');
    expect(result.id).toBeDefined();
    expect(result.qrHash).toBe('qr-firmado');
    expect(redis.set).toHaveBeenCalledWith(
      'viaje:availability:viaje-1',
      '37',
      60,
    );
  });

  it('impide generar dos tickets para el mismo usuario y viaje', async () => {
    prisma.viaje.findUnique.mockResolvedValue(viaje);
    prisma.busTicket.findFirst.mockResolvedValue({ id: 'ticket-previo' });

    await expect(service.generateTicket('usuario-1', 'viaje-1')).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.busTicket.create).not.toHaveBeenCalled();
  });
});
