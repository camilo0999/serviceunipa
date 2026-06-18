import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MenuDia } from '@prisma/client';

@Injectable()
export class NotificacionesService implements OnModuleInit {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Only initialize if we have credentials
    if (process.env.FIREBASE_PROJECT_ID) {
      try {
        if (!getApps().length) {
          initializeApp({
            credential: cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(
                /\\n/g,
                '\n',
              ),
            }),
          });
          this.logger.log('Firebase Admin inicializado correctamente.');
        }
      } catch (error) {
        this.logger.error('Error al inicializar Firebase Admin', error);
      }
    } else {
      this.logger.warn(
        'Faltan credenciales de Firebase en las variables de entorno (.env). Las notificaciones push no se enviarán.',
      );
    }
  }

  // Se ejecuta cada minuto para revisar menús próximos
  @Cron(CronExpression.EVERY_MINUTE)
  async revisarNotificacionesMenus() {
    const ahora = new Date();
    // Buscar menús que empiezan en 20 minutos
    const dentroDe20Minutos = new Date(ahora.getTime() + 20 * 60000);
    const hace20Minutos = new Date(ahora.getTime() + 19 * 60000);

    const menusProximos = await this.prisma.menuDia.findMany({
      where: {
        activo: true,
        fecha: new Date(ahora.toISOString().split('T')[0]),
        horaInicio: {
          gte: hace20Minutos,
          lte: dentroDe20Minutos,
        },
      },
    });

    for (const menu of menusProximos) {
      await this.notificarEstudiantesElegibles(menu);
    }
  }

  async notificarEstudiantesElegibles(menu: MenuDia) {
    // 1. Obtener los usuarios elegibles para este menú basándonos en si tienen clase
    // En una implementación real, filtrar solo los estudiantes que tienen materias cruzando
    const dayOfWeek = menu.fecha.getUTCDay();

    // Obtener las inscripciones que caen en este día
    const inscripciones = await this.prisma.inscripcionMateria.findMany({
      where: {
        materia: {
          diasSemana: { has: dayOfWeek },
        },
      },
      include: {
        usuario: {
          include: {
            dispositivos: {
              where: { activo: true },
            },
          },
        },
      },
    });

    // Recolectar tokens FCM
    const tokens = new Set<string>();
    for (const inscripcion of inscripciones) {
      if (inscripcion.usuario.dispositivos) {
        for (const dispositivo of inscripcion.usuario.dispositivos) {
          if (dispositivo.fcmToken) {
            tokens.add(dispositivo.fcmToken);
          }
        }
      }
    }

    const tokensArray = Array.from(tokens);
    if (tokensArray.length > 0) {
      await this.enviarPush(
        tokensArray,
        `Recordatorio de ${menu.tipoComida}`,
        `¡Tu ${menu.tipoComida} está disponible en 20 minutos! No olvides generar tu ticket.`,
      );
    }
  }

  async enviarPush(tokens: string[], titulo: string, mensaje: string) {
    if (!getApps().length) return;

    try {
      const response = await getMessaging().sendEachForMulticast({
        tokens,
        notification: {
          title: titulo,
          body: mensaje,
        },
      });
      this.logger.log(
        `Notificaciones enviadas: ${response.successCount} exitosas, ${response.failureCount} fallidas.`,
      );
    } catch (error) {
      this.logger.error('Error al enviar notificaciones FCM', error);
    }
  }
}
