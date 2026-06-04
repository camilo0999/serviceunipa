import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DispositivosService } from './dispositivos.service';
import { CreateDispositivoDto } from './dto/create-dispositivo.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

@Controller('dispositivos')
@UseGuards(JwtAuthGuard)
export class DispositivosController {
  constructor(private readonly dispositivosService: DispositivosService) {}

  @Post()
  register(@Req() req: Request, @Body() dto: CreateDispositivoDto) {
    const user = req.user as any;
    return this.dispositivosService.register(user.sub, dto);
  }

  @Get()
  findAll(@Req() req: Request) {
    const user = req.user as any;
    return this.dispositivosService.findAll(user.sub);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.dispositivosService.deactivate(id);
  }
}
