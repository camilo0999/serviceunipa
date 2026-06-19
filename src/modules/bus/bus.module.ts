import { Module } from '@nestjs/common';
import { BusService } from './bus.service';
import { BusController } from './bus.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, RedisModule, JwtModule.register({})],
  controllers: [BusController],
  providers: [BusService],
  exports: [BusService],
})
export class BusModule {}
