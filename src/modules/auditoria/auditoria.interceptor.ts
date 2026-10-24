import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Claves cuyo valor nunca debe quedar almacenado en la auditoría.
 * La comparación es sobre el nombre de la clave, sin distinguir mayúsculas.
 */
const SENSITIVE_KEY_PATTERN =
  /(password|passwd|contrase(ñ|n)a|new_password|current_password|token|secret|authorization|cookie|qr[_-]?hash)/i;

const MAX_DEPTH = 6;
const MAX_ARRAY_ITEMS = 50;
const MAX_STRING_LENGTH = 2000;

function sanitizeForAudit(value: unknown, depth = 0): unknown {
  if (value == null) return value;

  if (value instanceof Date) return value.toISOString();

  if (Buffer.isBuffer(value)) return `[buffer ${value.length} bytes]`;

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]`
      : value;
  }

  if (typeof value !== 'object') return value;

  if (depth >= MAX_DEPTH) return '[truncated]';

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeForAudit(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? '[REDACTED]'
      : sanitizeForAudit(item, depth + 1);
  }
  return result;
}

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

      return next.handle().pipe(
        tap(async (data) => {
          try {
            await this.prisma.auditoria.create({
              data: {
                usuarioId: user?.sub || undefined,
                accion: `${method} ${url}`,
                tablaAfectada: url.split('/')[1] || 'unknown',
                registroId: data?.id || undefined,
                datosAnteriores: undefined,
                // Nunca persistir contraseñas, tokens, refresh tokens ni QR.
                datosNuevos: sanitizeForAudit(data) as any,
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
