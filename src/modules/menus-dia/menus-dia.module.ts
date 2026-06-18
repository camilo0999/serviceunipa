import { Module } from '@nestjs/common';
import { MenusDiaController } from './menus-dia.controller';
import { MenusDiaService } from './menus-dia.service';

@Module({
  controllers: [MenusDiaController],
  providers: [MenusDiaService],
})
export class MenusDiaModule {}
