import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_SECURE') === 'true', // true for 465, false for other ports
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
    });
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    userName: string,
  ): Promise<void> {
    const resetUrl = `${this.configService.get('BACKEND_URL')}/auth/password/reset?token=${resetToken}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f0f0f0; padding: 10px; border-radius: 5px; }
            .content { margin: 20px 0; }
            .button { 
              display: inline-block; 
              padding: 10px 20px; 
              background-color: #007bff; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer { color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Recuperación de Contraseña</h2>
            </div>
            
            <div class="content">
              <p>Hola ${userName},</p>
              
              <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si no hiciste esta solicitud, puedes ignorar este correo.</p>
              
              <p>Para restablecer tu contraseña, haz clic en el botón de abajo:</p>
              
              <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
              
              <p>O copia y pega este enlace en tu navegador:</p>
              <p><small>${resetUrl}</small></p>
              
              <p><strong>Este enlace expirará en 1 hora.</strong></p>
              
              <p>Si tienes problemas, puedes responder a este correo para obtener ayuda.</p>
            </div>
            
            <div class="footer">
              <p>© 2026 Universidad del Pacífico. Todos los derechos reservados.</p>
              <p>Este es un correo automático, por favor no respondas directamente a este mensaje.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM'),
        to: email,
        subject: 'Recuperación de Contraseña - Universidad del Pacífico',
        html: htmlContent,
        text: `Para restablecer tu contraseña, accede a: ${resetUrl}. Este enlace expirará en 1 hora.`,
      });
    } catch (error) {
      console.error('Error al enviar email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, userName: string): Promise<void> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f0f0f0; padding: 10px; border-radius: 5px; }
            .content { margin: 20px 0; }
            .footer { color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>¡Bienvenido!</h2>
            </div>
            
            <div class="content">
              <p>Hola ${userName},</p>
              <p>Tu cuenta ha sido creada exitosamente. Ya puedes acceder a la plataforma con tus credenciales.</p>
            </div>
            
            <div class="footer">
              <p>© 2026 Universidad del Pacífico. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM'),
        to: email,
        subject: 'Bienvenido a la plataforma - Universidad del Pacífico',
        html: htmlContent,
      });
    } catch (error) {
      console.error('Error al enviar email de bienvenida:', error);
      throw error;
    }
  }
}
