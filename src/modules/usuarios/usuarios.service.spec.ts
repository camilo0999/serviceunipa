import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosService } from './usuarios.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsuariosService', () => {
  let service: UsuariosService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      menuDia: { findMany: jest.fn() },
      inscripcionMateria: { findMany: jest.fn() },
      ruta: { findMany: jest.fn() },
      viaje: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  it('debe exponer rutas activas como buses disponibles aunque no exista un viaje creado', async () => {
    prisma.menuDia.findMany.mockResolvedValue([]);
    prisma.inscripcionMateria.findMany.mockResolvedValue([]);
    const now = new Date();
    const futureTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 2, now.getUTCMinutes()));
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    prisma.ruta.findMany.mockResolvedValue([
      {
        id: 'ruta-1',
        nombre: 'Ruta principal',
        origen: 'Campus',
        destino: 'Terminal',
        capacidadTotal: 40,
        horaSalida: futureTime,
        activo: true,
        horarios: [],
      },
    ]);
    prisma.viaje.findMany.mockResolvedValue([]);
    prisma.viaje.findFirst.mockResolvedValue(null);
    jest.spyOn(Date, 'now').mockImplementation(() => today.getTime());
    prisma.viaje.create.mockResolvedValue({
      id: 'viaje-1',
      rutaId: 'ruta-1',
      horarioId: null,
      capacidadTotal: 40,
      ocupados: 0,
      fecha: null,
    });

    const result = await service.getBeneficios('usuario-1');

    expect(result.elegibilidad.bus.disponible).toBe(true);
    expect(result.elegibilidad.bus.mensaje).toContain('Hay viajes de bus disponibles hoy.');
    expect(result.proximoServicio?.tipo).toBe('bus');
    expect(result.proximoServicio?.nombre).toBe('Ruta principal');

    jest.restoreAllMocks();
  });
});
