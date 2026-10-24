import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from 'src/modules/redis/redis.module';
import { NotificacionesModule } from 'src/modules/notificaciones/notificaciones.module';
import { getJwtSecret } from 'src/auth/jwt-secret';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    NotificacionesModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getJwtSecret(),
      }),
    }),
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
