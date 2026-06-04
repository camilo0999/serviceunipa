import { Injectable, NotFoundException } from '@nestjs/common';
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
      },
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
    const data: any = { ...updateUsuarioDto };
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
}
