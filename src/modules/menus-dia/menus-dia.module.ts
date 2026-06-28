import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MenusDiaController } from './menus-dia.controller';
import { MenusDiaService } from './menus-dia.service';
import { TicketsService } from '../tickets/tickets.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'secret',
      }),
    }),
  ],
  controllers: [MenusDiaController],
  providers: [MenusDiaService, TicketsService],
})
export class MenusDiaModule {}
