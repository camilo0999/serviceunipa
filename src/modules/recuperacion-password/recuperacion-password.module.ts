import { Module } from '@nestjs/common';
import { RecuperacionPasswordService } from './recuperacion-password.service';
import { RecuperacionPasswordController } from './recuperacion-password.controller';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [UsuariosModule],
  controllers: [RecuperacionPasswordController],
  providers: [RecuperacionPasswordService],
})
export class RecuperacionPasswordModule {}
