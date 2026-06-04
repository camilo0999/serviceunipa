import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;

    // Only audit modifying requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const user = req.user;
      const url = req.url;
      const ip = req.ip;
      const body = req.body;

      return next.handle().pipe(
        tap(async (data) => {
          try {
            await this.prisma.auditoria.create({
              data: {
                usuarioId: user?.sub || undefined,
                accion: `${method} ${url}`,
                tablaAfectada: url.split('/')[1] || 'unknown',
                registroId: data?.id || undefined,
                datosAnteriores: undefined, // Hard to capture generically without repository pattern overrides
                datosNuevos: data,
                ipAddress: ip,
              },
            });
          } catch (e) {
            console.error('Audit Error:', e);
          }
        }),
      );
    }

    return next.handle();
  }
}
