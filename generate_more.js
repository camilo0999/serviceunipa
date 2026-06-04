const fs = require('fs');
const path = require('path');

const files = {
  // SESIONES
  'src/modules/sesiones/sesiones.module.ts': `import { Module } from '@nestjs/common';
import { SesionesService } from './sesiones.service';
import { SesionesController } from './sesiones.controller';

@Module({
  controllers: [SesionesController],
  providers: [SesionesService],
  exports: [SesionesService]
})
export class SesionesModule {}`,
  'src/modules/sesiones/sesiones.service.ts': `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SesionesService {
  constructor(private prisma: PrismaService) {}

  async findAll(usuarioId: string) {
    return this.prisma.sesion.findMany({
      where: { usuarioId }
    });
  }

  async revoke(id: string) {
    return this.prisma.sesion.update({
      where: { id },
      data: { revocada: true }
    });
  }
}`,
  'src/modules/sesiones/sesiones.controller.ts': `import { Controller, Get, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { SesionesService } from './sesiones.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('sesiones')
@UseGuards(JwtAuthGuard)
export class SesionesController {
  constructor(private readonly sesionesService: SesionesService) {}

  @Get()
  findAll(@Req() req: Request) {
    const user = req.user as any;
    return this.sesionesService.findAll(user.sub);
  }

  @Patch(':id/revoke')
  revoke(@Param('id') id: string) {
    return this.sesionesService.revoke(id);
  }
}`,

  // DISPOSITIVOS
  'src/modules/dispositivos/dto/create-dispositivo.dto.ts': `import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { PlataformaDispositivo } from '@prisma/client';

export class CreateDispositivoDto {
  @IsString()
  fcmToken: string;

  @IsEnum(PlataformaDispositivo)
  plataforma: PlataformaDispositivo;

  @IsString()
  @IsOptional()
  modelo?: string;
}`,
  'src/modules/dispositivos/dispositivos.module.ts': `import { Module } from '@nestjs/common';
import { DispositivosService } from './dispositivos.service';
import { DispositivosController } from './dispositivos.controller';

@Module({
  controllers: [DispositivosController],
  providers: [DispositivosService],
  exports: [DispositivosService]
})
export class DispositivosModule {}`,
  'src/modules/dispositivos/dispositivos.service.ts': `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDispositivoDto } from './dto/create-dispositivo.dto';

@Injectable()
export class DispositivosService {
  constructor(private prisma: PrismaService) {}

  async register(usuarioId: string, dto: CreateDispositivoDto) {
    return this.prisma.dispositivo.upsert({
      where: { fcmToken: dto.fcmToken },
      update: { usuarioId, activo: true, ultimoUso: new Date() },
      create: { ...dto, usuarioId }
    });
  }

  async findAll(usuarioId: string) {
    return this.prisma.dispositivo.findMany({ where: { usuarioId } });
  }

  async deactivate(id: string) {
    return this.prisma.dispositivo.update({
      where: { id },
      data: { activo: false }
    });
  }
}`,
  'src/modules/dispositivos/dispositivos.controller.ts': `import { Controller, Get, Post, Body, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { DispositivosService } from './dispositivos.service';
import { CreateDispositivoDto } from './dto/create-dispositivo.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';

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
}`,

  // RECUPERACION PASSWORD
  'src/modules/recuperacion-password/recuperacion-password.module.ts': `import { Module } from '@nestjs/common';
import { RecuperacionPasswordService } from './recuperacion-password.service';
import { RecuperacionPasswordController } from './recuperacion-password.controller';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [UsuariosModule],
  controllers: [RecuperacionPasswordController],
  providers: [RecuperacionPasswordService],
})
export class RecuperacionPasswordModule {}`,
  'src/modules/recuperacion-password/recuperacion-password.service.ts': `import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RecuperacionPasswordService {
  constructor(
    private prisma: PrismaService,
    private usuariosService: UsuariosService
  ) {}

  async requestReset(email: string) {
    const user = await this.usuariosService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const expiraEn = new Date();
    expiraEn.setHours(expiraEn.getHours() + 1);

    await this.prisma.recuperacionPassword.create({
      data: {
        usuarioId: user.id,
        tokenHash,
        expiraEn
      }
    });

    // In a real app, send the email here
    return { message: 'Reset email sent', token }; // Returning token for testing purposes
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.recuperacionPassword.findUnique({ where: { tokenHash } });

    if (!record || record.usado || record.expiraEn < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.prisma.recuperacionPassword.update({
      where: { id: record.id },
      data: { usado: true }
    });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.usuario.update({
      where: { id: record.usuarioId },
      data: { passwordHash }
    });

    // Invalidate sessions
    await this.prisma.sesion.updateMany({
      where: { usuarioId: record.usuarioId },
      data: { revocada: true }
    });

    return { message: 'Password reset successful' };
  }
}`,
  'src/modules/recuperacion-password/recuperacion-password.controller.ts': `import { Controller, Post, Body } from '@nestjs/common';
import { RecuperacionPasswordService } from './recuperacion-password.service';

@Controller('auth/password')
export class RecuperacionPasswordController {
  constructor(private readonly recuperacionPasswordService: RecuperacionPasswordService) {}

  @Post('forgot')
  requestReset(@Body('email') email: string) {
    return this.recuperacionPasswordService.requestReset(email);
  }

  @Post('reset')
  resetPassword(@Body('token') token: string, @Body('new_password') newPassword: string) {
    return this.recuperacionPasswordService.resetPassword(token, newPassword);
  }
}`,

  // TOKEN BLACKLIST
  'src/modules/token-blacklist/token-blacklist.module.ts': `import { Module } from '@nestjs/common';
import { TokenBlacklistService } from './token-blacklist.service';

@Module({
  providers: [TokenBlacklistService],
  exports: [TokenBlacklistService]
})
export class TokenBlacklistModule {}`,
  'src/modules/token-blacklist/token-blacklist.service.ts': `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TokenBlacklistService {
  constructor(private prisma: PrismaService) {}

  async cleanup() {
    return this.prisma.tokenBlacklist.deleteMany({
      where: {
        expiraEn: { lt: new Date() }
      }
    });
  }
}`,

  // UPDATE APP MODULE
  'src/app.module.ts': `import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { SesionesModule } from './modules/sesiones/sesiones.module';
import { DispositivosModule } from './modules/dispositivos/dispositivos.module';
import { RecuperacionPasswordModule } from './modules/recuperacion-password/recuperacion-password.module';
import { TokenBlacklistModule } from './modules/token-blacklist/token-blacklist.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsuariosModule,
    AuthModule,
    AuditoriaModule,
    SesionesModule,
    DispositivosModule,
    RecuperacionPasswordModule,
    TokenBlacklistModule
  ],
})
export class AppModule {}`
};

for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(__dirname, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

console.log('Additional modules generated successfully.');
