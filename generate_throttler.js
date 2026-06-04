const fs = require('fs');
const path = require('path');
const content = `import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { SesionesModule } from './modules/sesiones/sesiones.module';
import { DispositivosModule } from './modules/dispositivos/dispositivos.module';
import { RecuperacionPasswordModule } from './modules/recuperacion-password/recuperacion-password.module';
import { TokenBlacklistModule } from './modules/token-blacklist/token-blacklist.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PrismaModule,
    UsuariosModule,
    AuthModule,
    AuditoriaModule,
    SesionesModule,
    DispositivosModule,
    RecuperacionPasswordModule,
    TokenBlacklistModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}`;
fs.writeFileSync(path.join(__dirname, 'src/app.module.ts'), content);
