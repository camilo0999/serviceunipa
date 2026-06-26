import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as csv from 'csv-parse/sync';

type ScheduleRecord = {
  codigoEstudiantil: string;
  materiaCodigo?: string;
  materiaNombre: string;
  semestre: string;
  dia?: string; // opcional
  hora_inicio?: string; // HH:MM opcional
  hora_fin?: string; // HH:MM opcional
  lugar?: string;
};

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  parseCsv(buffer: Buffer) {
    try {
      const text = buffer.toString('utf8');
      const records = csv.parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as ScheduleRecord[];
      return records;
    } catch (err) {
      throw new BadRequestException('CSV inválido');
    }
  }

  validateRecord(r: ScheduleRecord) {
    if (!r.codigoEstudiantil || !r.materiaNombre || !r.semestre) return false;
    return true;
  }

  async importSchedules(records: ScheduleRecord[]) {
    const results = { inserted: 0, skipped: 0, errors: [] as any[] };
    for (const r of records) {
      if (!this.validateRecord(r)) {
        results.skipped++;
        results.errors.push({ record: r, reason: 'invalid' });
        continue;
      }

      try {
        const usuario = await this.prisma.usuario.findUnique({
          where: { codigoEstudiantil: r.codigoEstudiantil },
        });
        if (!usuario) {
          results.skipped++;
          results.errors.push({ record: r, reason: 'usuario_no_encontrado' });
          continue;
        }

        // Buscar o crear materia
        let materia: any = null;
        if (r.materiaCodigo) {
          materia = await this.prisma.materia.findUnique({ where: { codigo: r.materiaCodigo } });
        }
        if (!materia) {
          // intentar por nombre
          materia = await this.prisma.materia.findFirst({ where: { nombre: r.materiaNombre } });
        }
        if (!materia) {
          materia = await this.prisma.materia.create({
            data: {
              codigo: r.materiaCodigo || `GEN-${Date.now()}`,
              nombre: r.materiaNombre,
              horaInicio: r.hora_inicio ? new Date(`1970-01-01T${r.hora_inicio}:00Z`) : new Date('1970-01-01T00:00:00Z'),
              horaFin: r.hora_fin ? new Date(`1970-01-01T${r.hora_fin}:00Z`) : new Date('1970-01-01T00:00:00Z'),
              diasSemana: r.dia ? this.parseDiaToArray(r.dia) : [],
            },
          });
        }

        // Crear inscripcion si no existe
        if (!materia) {
          results.skipped++;
          results.errors.push({ record: r, reason: 'materia_creation_failed' });
          continue;
        }

        await this.prisma.inscripcionMateria.upsert({
          where: {
            usuarioId_materiaId_semestre: {
              usuarioId: usuario.id,
              materiaId: materia.id,
              semestre: r.semestre,
            },
          },
          update: {},
          create: {
            usuarioId: usuario.id,
            materiaId: materia.id,
            semestre: r.semestre,
          },
        });

        results.inserted++;
      } catch (err) {
        results.skipped++;
        results.errors.push({ record: r});
      }
    }
    return results;
  }

  parseDiaToArray(dia: string) {
    // Intento mapear nombres a índices (0 domingo .. 6 sabado)
    const map: Record<string, number> = {
      domingo: 0,
      lunes: 1,
      martes: 2,
      miercoles: 3,
      jueves: 4,
      viernes: 5,
      sabado: 6,
    };
    const key = dia.toLowerCase().trim();
    if (map[key] !== undefined) return [map[key]];
    return [];
  }
}
