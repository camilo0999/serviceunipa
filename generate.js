const fs = require('fs');
const path = require('path');

const files = {
  'prisma/schema.prisma': `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum RolUsuario {
  estudiante
  operador_comedor
  operador_bus
  administrador
}

enum TurnoUsuario {
  dia
  noche
  mixto
}

enum PlataformaDispositivo {
  android
  ios
}

model Usuario {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  codigoEstudiantil String    @unique @map("codigo_estudiantil") @db.VarChar(20)
  nombre            String    @db.VarChar(100)
  apellido          String    @db.VarChar(100)
  email             String    @unique @db.VarChar(255)
  passwordHash      String    @map("password_hash") @db.VarChar(255)
  rol               RolUsuario @default(estudiante)
  turno             TurnoUsuario @default(dia)
  activo            Boolean   @default(true)
  fotoUrl           String?   @map("foto_url") @db.Text
  creadoEn          DateTime  @default(now()) @map("creado_en") @db.Timestamptz
  actualizadoEn     DateTime  @default(now()) @updatedAt @map("actualizado_en") @db.Timestamptz

  sesiones             Sesion[]
  tokensBlacklist      TokenBlacklist[]
  dispositivos         Dispositivo[]
  recuperacionesPass   RecuperacionPassword[]
  auditorias           Auditoria[]

  @@index([email])
  @@index([codigoEstudiantil])
  @@index([rol, turno])
  @@index([activo])
  
  @@map("usuarios")
}

model Sesion {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  usuarioId    String   @map("usuario_id") @db.Uuid
  refreshToken String   @unique @map("refresh_token") @db.VarChar(512)
  ipAddress    String?  @map("ip_address") @db.Inet
  userAgent    String?  @map("user_agent") @db.Text
  revocada     Boolean  @default(false)
  expiraEn     DateTime @map("expira_en") @db.Timestamptz
  creadoEn     DateTime @default(now()) @map("creado_en") @db.Timestamptz

  usuario      Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  @@index([usuarioId])
  @@index([refreshToken])
  @@index([usuarioId, revocada])
  @@index([expiraEn])

  @@map("sesiones")
}

model TokenBlacklist {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tokenJti  String   @unique @map("token_jti") @db.VarChar(36)
  usuarioId String   @map("usuario_id") @db.Uuid
  expiraEn  DateTime @map("expira_en") @db.Timestamptz
  creadoEn  DateTime @default(now()) @map("creado_en") @db.Timestamptz

  usuario   Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  @@index([tokenJti])
  @@index([expiraEn])

  @@map("token_blacklist")
}

model Dispositivo {
  id         String                @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  usuarioId  String                @map("usuario_id") @db.Uuid
  fcmToken   String                @unique @map("fcm_token") @db.Text
  plataforma PlataformaDispositivo
  modelo     String?               @db.VarChar(100)
  activo     Boolean               @default(true)
  ultimoUso  DateTime              @default(now()) @map("ultimo_uso") @db.Timestamptz
  creadoEn   DateTime              @default(now()) @map("creado_en") @db.Timestamptz

  usuario    Usuario               @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  @@index([usuarioId])
  @@index([usuarioId, activo])

  @@map("dispositivos")
}

model RecuperacionPassword {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  usuarioId String   @map("usuario_id") @db.Uuid
  tokenHash String   @unique @map("token_hash") @db.VarChar(255)
  usado     Boolean  @default(false)
  expiraEn  DateTime @map("expira_en") @db.Timestamptz
  creadoEn  DateTime @default(now()) @map("creado_en") @db.Timestamptz

  usuario   Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  @@index([usuarioId])
  @@index([tokenHash])
  @@index([expiraEn])

  @@map("recuperacion_password")
}

model Auditoria {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  usuarioId       String?  @map("usuario_id") @db.Uuid
  accion          String   @db.VarChar(100)
  tablaAfectada   String   @map("tabla_afectada") @db.VarChar(100)
  registroId      String?  @map("registro_id") @db.Uuid
  datosAnteriores Json?    @map("datos_anteriores")
  datosNuevos     Json?    @map("datos_nuevos")
  ipAddress       String?  @map("ip_address") @db.Inet
  creadoEn        DateTime @default(now()) @map("creado_en") @db.Timestamptz

  usuario         Usuario? @relation(fields: [usuarioId], references: [id], onDelete: SetNull)

  @@index([usuarioId])
  @@index([tablaAfectada])
  @@index([creadoEn(sort: Desc)])
  @@index([registroId])
  
  @@map("auditoria")
}`,
  'src/prisma/prisma.service.ts': `import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}`,
  'src/prisma/prisma.module.ts': `import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}`,
  'src/modules/usuarios/dto/create-usuario.dto.ts': `import { IsString, IsEmail, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { RolUsuario, TurnoUsuario } from '@prisma/client';

export class CreateUsuarioDto {
  @IsString()
  codigoEstudiantil: string;

  @IsString()
  nombre: string;

  @IsString()
  apellido: string;

  @IsEmail()
  email: string;

  @IsString()
  passwordHash: string;

  @IsEnum(RolUsuario)
  @IsOptional()
  rol?: RolUsuario;

  @IsEnum(TurnoUsuario)
  @IsOptional()
  turno?: TurnoUsuario;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsString()
  @IsOptional()
  fotoUrl?: string;
}`,
  'src/modules/usuarios/dto/update-usuario.dto.ts': `import { PartialType } from '@nestjs/mapped-types';
import { CreateUsuarioDto } from './create-usuario.dto';

export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {}`,
  'src/modules/usuarios/usuarios.service.ts': `import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    const { passwordHash, ...rest } = createUsuarioDto;
    const hashed = await bcrypt.hash(passwordHash, 12);
    
    const user = await this.prisma.usuario.create({
      data: {
        ...rest,
        passwordHash: hashed,
      },
    });
    delete (user as any).passwordHash;
    return user;
  }

  async findAll() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        codigoEstudiantil: true,
        nombre: true,
        apellido: true,
        email: true,
        rol: true,
        turno: true,
        activo: true,
        fotoUrl: true,
        creadoEn: true,
        actualizadoEn: true,
      }
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.usuario.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    delete (user as any).passwordHash;
    return user;
  }
  
  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  async update(id: string, updateUsuarioDto: UpdateUsuarioDto) {
    const data = { ...updateUsuarioDto };
    if (data.passwordHash) {
      data.passwordHash = await bcrypt.hash(data.passwordHash, 12);
    }
    const user = await this.prisma.usuario.update({
      where: { id },
      data,
    });
    delete (user as any).passwordHash;
    return user;
  }

  async remove(id: string) {
    return this.prisma.usuario.delete({ where: { id } });
  }
}`,
  'src/modules/usuarios/usuarios.controller.ts': `import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUsuarioDto: UpdateUsuarioDto) {
    return this.usuariosService.update(id, updateUsuarioDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(id);
  }
}`,
  'src/modules/usuarios/usuarios.module.ts': `import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';

@Module({
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService]
})
export class UsuariosModule {}`,
  'src/auth/auth.service.ts': `import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from '../modules/usuarios/usuarios.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usuariosService.findByEmail(email);
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any, ipAddress: string, userAgent: string) {
    const payload = { email: user.email, sub: user.id, rol: user.rol };
    const accessToken = this.jwtService.sign(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    });
    const refreshToken = randomBytes(64).toString('hex');
    
    const expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + 30); // 30 days
    
    await this.prisma.sesion.create({
        data: {
            usuarioId: user.id,
            refreshToken,
            ipAddress,
            userAgent,
            expiraEn
        }
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken
    };
  }

  async refresh(oldToken: string) {
      const session = await this.prisma.sesion.findUnique({ where: { refreshToken: oldToken } });
      if (!session || session.revocada || session.expiraEn < new Date()) {
          throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Rotate token
      const newToken = randomBytes(64).toString('hex');
      const expiraEn = new Date();
      expiraEn.setDate(expiraEn.getDate() + 30);

      await this.prisma.sesion.update({
          where: { id: session.id },
          data: { refreshToken: newToken, expiraEn }
      });

      const user = await this.usuariosService.findOne(session.usuarioId);
      const payload = { email: user.email, sub: user.id, rol: user.rol };
      const accessToken = this.jwtService.sign(payload, {
          expiresIn: process.env.JWT_EXPIRES_IN || '15m'
      });

      return {
          access_token: accessToken,
          refresh_token: newToken
      };
  }

  async logout(userId: string, jti: string, exp: number, refreshToken: string) {
      await this.prisma.sesion.updateMany({
          where: { refreshToken },
          data: { revocada: true }
      });
      
      await this.prisma.tokenBlacklist.create({
          data: {
              tokenJti: jti,
              usuarioId: userId,
              expiraEn: new Date(exp * 1000)
          }
      });
  }
}`,
  'src/auth/auth.controller.ts': `import { Controller, Post, Body, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: Request) {
    return this.authService.login(req.user, req.ip, req.headers['user-agent']);
  }

  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    return this.authService.refresh(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request, @Body('refresh_token') refreshToken: string) {
    const { sub, jti, exp } = req.user as any;
    await this.authService.logout(sub, jti, exp, refreshToken);
    return { message: 'Logged out successfully' };
  }
}`,
  'src/auth/strategies/jwt.strategy.ts': `import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secret',
      jwtid: true
    });
  }

  async validate(payload: any) {
    const isBlacklisted = await this.prisma.tokenBlacklist.findUnique({
      where: { tokenJti: payload.jti }
    });
    if (isBlacklisted) throw new UnauthorizedException('Token has been revoked');
    return payload; // Attached to req.user
  }
}`,
  'src/auth/strategies/local.strategy.ts': `import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, pass: string): Promise<any> {
    const user = await this.authService.validateUser(email, pass);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}`,
  'src/auth/guards/jwt-auth.guard.ts': `import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}`,
  'src/auth/guards/local-auth.guard.ts': `import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}`,
  'src/auth/auth.module.ts': `import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsuariosModule } from '../modules/usuarios/usuarios.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    UsuariosModule,
    PassportModule,
    JwtModule.registerAsync({
        useFactory: () => ({
            secret: process.env.JWT_SECRET || 'secret',
            signOptions: { 
                expiresIn: process.env.JWT_EXPIRES_IN || '15m',
                jwtid: require('crypto').randomUUID()
            },
        })
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
})
export class AuthModule {}`,
  'src/modules/auditoria/auditoria.interceptor.ts': `import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    
    // Only audit modifying requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const user = req.user;
      const url = req.url;
      const ip = req.ip;
      const body = req.body;
      
      return next.handle().pipe(
        tap(async (data) => {
           try {
               await this.prisma.auditoria.create({
                 data: {
                   usuarioId: user?.sub || null,
                   accion: \`\${method} \${url}\`,
                   tablaAfectada: url.split('/')[1] || 'unknown',
                   registroId: data?.id || null,
                   datosAnteriores: null, // Hard to capture generically without repository pattern overrides
                   datosNuevos: data,
                   ipAddress: ip
                 }
               });
           } catch (e) {
               console.error('Audit Error:', e);
           }
        })
      );
    }
    
    return next.handle();
  }
}`,
  'src/modules/auditoria/auditoria.module.ts': `import { Module } from '@nestjs/common';
import { AuditoriaInterceptor } from './auditoria.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditoriaInterceptor,
    }
  ],
})
export class AuditoriaModule {}`,
  'src/app.module.ts': `import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsuariosModule,
    AuthModule,
    AuditoriaModule
  ],
})
export class AppModule {}`,
  'src/main.ts': `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security
  app.use(helmet());
  app.enableCors();
  
  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  }));
  
  // Shutdown Hooks for Prisma
  app.enableShutdownHooks();

  await app.listen(process.env.PORT || 3000);
}
bootstrap();`,
  '.env.example': `DATABASE_URL="postgresql://user:password@localhost:5432/db_name?schema=public"
JWT_SECRET="secret123"
JWT_REFRESH_SECRET="refreshsecret123"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"
PORT=3000`
};

for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(__dirname, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

console.log('Project files generated successfully.');
