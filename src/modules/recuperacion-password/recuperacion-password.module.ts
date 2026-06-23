import { Module } from '@nestjs/common';
import { RecuperacionPasswordService } from './recuperacion-password.service';
import { RecuperacionPasswordController } from './recuperacion-password.controller';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [UsuariosModule, EmailModule],
  controllers: [RecuperacionPasswordController],
  providers: [RecuperacionPasswordService],
})
export class RecuperacionPasswordModule {}
