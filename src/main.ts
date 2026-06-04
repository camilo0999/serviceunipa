import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true, // Acumular logs hasta que Pino esté listo
  });
  
  // Usar Pino como logger global para NestJS
  app.useLogger(app.get(Logger));

  // Fundamental para estar detrás de Nginx (HTTPS) y leer IPs reales
  app.set('trust proxy', 1);

  // Security
  app.use(helmet());
  app.enableCors();

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Shutdown Hooks for Prisma
  app.enableShutdownHooks();

  await app.listen(process.env.PORT || 3000);
}
bootstrap().catch((err) => {
  console.error('Error starting server', err);
});
