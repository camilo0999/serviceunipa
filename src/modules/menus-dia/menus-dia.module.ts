import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MenusDiaController } from './menus-dia.controller';
import { MenusDiaService } from './menus-dia.service';
import { TicketsService } from '../tickets/tickets.service';
import { getJwtSecret } from 'src/auth/jwt-secret';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getJwtSecret(),
      }),
    }),
  ],
  controllers: [MenusDiaController],
  providers: [MenusDiaService, TicketsService],
})
export class MenusDiaModule {}
