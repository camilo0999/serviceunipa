import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from 'src/modules/redis/redis.module';
import { NotificacionesModule } from 'src/modules/notificaciones/notificaciones.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    NotificacionesModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'secret',
      }),
    }),
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
