import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true, // Acumular logs hasta que Pino esté listo
  });

  // Usar Pino como logger global para NestJS
  app.useLogger(app.get(Logger));

  // Fundamental para estar detrás de Nginx (HTTPS) y leer IPs reales
  app.set('trust proxy', 1);

  // Security - Disable CSP so Swagger UI can load its CSS and JS
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.enableCors();

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('API Universidad del Pacífico')
    .setDescription(
      'Documentación de la API para el servicio de la Universidad del Pacífico',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingrese el token JWT obtenido del inicio de sesión',
        in: 'header',
      },
      'JWT-auth', // Nombre de la referencia de autenticación
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Shutdown Hooks for Prisma
  app.enableShutdownHooks();

  await app.listen(process.env.PORT || 3000);
}
bootstrap().catch((err) => {
  console.error('Error starting server', err);
});
