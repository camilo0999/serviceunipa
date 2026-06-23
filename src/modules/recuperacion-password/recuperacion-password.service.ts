import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { EmailService } from '../email/email.service';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RecuperacionPasswordService {
  constructor(
    private prisma: PrismaService,
    private usuariosService: UsuariosService,
    private emailService: EmailService,
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
        expiraEn,
      },
    });

    // Enviar email con el token
    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        token,
        user.nombre,
      );
    } catch (error) {
      console.error('Error sending reset email:', error);
      // No lanzar excepción aquí, el token ya fue creado
    }

    return {
      message: 'Email de recuperación enviado exitosamente',
      success: true,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.recuperacionPassword.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usado || record.expiraEn < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.prisma.recuperacionPassword.update({
      where: { id: record.id },
      data: { usado: true },
    });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.usuario.update({
      where: { id: record.usuarioId },
      data: { passwordHash },
    });

    // Invalidate sessions
    await this.prisma.sesion.updateMany({
      where: { usuarioId: record.usuarioId },
      data: { revocada: true },
    });

    return { message: 'Password reset successful' };
  }
}
