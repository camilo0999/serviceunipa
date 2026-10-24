import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolUsuario } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const getAllAndOverride = jest.fn();
  const reflector = {
    getAllAndOverride,
  } as unknown as Reflector;

  const context = (rol: RolUsuario): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => ({ user: { rol } }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    getAllAndOverride.mockReset();
  });

  it('deniega el acceso si el endpoint no declara @Roles (fail-closed)', () => {
    getAllAndOverride.mockReturnValue(undefined);
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(context(RolUsuario.administrador))).toBe(false);
  });

  it('deniega el acceso si @Roles está vacío', () => {
    getAllAndOverride.mockReturnValue([]);
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(context(RolUsuario.administrador))).toBe(false);
  });

  it('permite el acceso cuando el rol está autorizado', () => {
    getAllAndOverride.mockReturnValue([RolUsuario.administrador]);
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(context(RolUsuario.administrador))).toBe(true);
  });

  it('deniega el acceso cuando el rol no está autorizado', () => {
    getAllAndOverride.mockReturnValue([RolUsuario.administrador]);
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(context(RolUsuario.estudiante))).toBe(false);
  });

  it('deniega el acceso si no hay usuario autenticado', () => {
    getAllAndOverride.mockReturnValue([RolUsuario.administrador]);
    const guard = new RolesGuard(reflector);

    const anonymousContext = {
      getHandler: () => ({}),
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(anonymousContext)).toBe(false);
  });
});
