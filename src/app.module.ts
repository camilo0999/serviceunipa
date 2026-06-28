import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { SesionesModule } from './modules/sesiones/sesiones.module';
import { DispositivosModule } from './modules/dispositivos/dispositivos.module';
import { RecuperacionPasswordModule } from './modules/recuperacion-password/recuperacion-password.module';
import { TokenBlacklistModule } from './modules/token-blacklist/token-blacklist.module';
import { RedisModule } from './modules/redis/redis.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { MenusDiaModule } from './modules/menus-dia/menus-dia.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { BusModule } from './modules/bus/bus.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ImportModule } from './modules/import/import.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined, // En producción imprime el JSON estructurado puro
        autoLogging: false, // Desactivar logs automáticos de peticiones HTTP para mantener limpio el log (opcional)
        formatters: {
          level: (label) => {
            return { level: label.toUpperCase() };
          },
        },
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    UsuariosModule,
    AuthModule,
    AuditoriaModule,
    SesionesModule,
    DispositivosModule,
    RecuperacionPasswordModule,
    TokenBlacklistModule,
    RedisModule,
    MenusDiaModule,
    BusModule,
    NotificacionesModule,
    // Módulo para importaciones masivas (CSV)
    ImportModule,
    MetricsModule,
    ReportsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
