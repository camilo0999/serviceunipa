import { Injectable, BadRequestException } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
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

type EnrollmentRecord = {
  codigoEstudiantil?: string;
  materiaCodigo?: string;
  semestre?: string;
};

type EnrollmentImportError = {
  fila: number;
  codigoEstudiantil: string;
  materiaCodigo: string;
  semestre: string;
  reason: string;
};

const ENROLLMENT_HEADER_ALIASES: Record<string, keyof EnrollmentRecord> = {
  codigoestudiantil: 'codigoEstudiantil',
  codigoestudiante: 'codigoEstudiantil',
  materiacodigo: 'materiaCodigo',
  codigomateria: 'materiaCodigo',
  semestre: 'semestre',
  periodo: 'semestre',
};

const normalizeHeader = (header: string) =>
  header
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  parseCsv(buffer: Buffer) {
    try {
      const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
      const records = csv.parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: [',', ';'],
      }) as ScheduleRecord[];
      return records;
    } catch (err) {
      throw new BadRequestException('CSV inválido');
    }
  }

  /**
   * Lee un CSV de inscripciones con las columnas codigoEstudiantil,
   * materiaCodigo y semestre. Acepta alias con guiones/guiones bajos,
   * BOM de Excel y separadores coma o punto y coma.
   */
  parseEnrollmentCsv(buffer: Buffer): EnrollmentRecord[] {
    try {
      const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
      const records = csv.parse(text, {
        columns: (header: string[]) =>
          header.map(
            (column) =>
              ENROLLMENT_HEADER_ALIASES[normalizeHeader(column)] ??
              normalizeHeader(column),
          ),
        skip_empty_lines: true,
        trim: true,
        delimiter: [',', ';'],
      }) as EnrollmentRecord[];

      if (records.length > 0) {
        const columns = new Set(Object.keys(records[0]));
        const required: Array<keyof EnrollmentRecord> = [
          'codigoEstudiantil',
          'materiaCodigo',
          'semestre',
        ];
        const missing = required.filter((column) => !columns.has(column));

        if (missing.length > 0) {
          throw new BadRequestException(
            'El CSV debe incluir las columnas codigoEstudiantil, materiaCodigo y semestre.',
          );
        }
      }

      return records;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
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

        if (usuario.rol !== RolUsuario.estudiante) {
          results.skipped++;
          results.errors.push({ record: r, reason: 'usuario_no_estudiante' });
          continue;
        }

        // Buscar o crear materia
        let materia: any = null;
        if (r.materiaCodigo) {
          materia = await this.prisma.materia.findUnique({
            where: { codigo: r.materiaCodigo },
          });
        }
        if (!materia) {
          // intentar por nombre
          materia = await this.prisma.materia.findFirst({
            where: { nombre: r.materiaNombre },
          });
        }
        if (!materia) {
          materia = await this.prisma.materia.create({
            data: {
              codigo: r.materiaCodigo || `GEN-${Date.now()}`,
              nombre: r.materiaNombre,
              horaInicio: r.hora_inicio
                ? new Date(`1970-01-01T${r.hora_inicio}:00Z`)
                : new Date('1970-01-01T00:00:00Z'),
              horaFin: r.hora_fin
                ? new Date(`1970-01-01T${r.hora_fin}:00Z`)
                : new Date('1970-01-01T00:00:00Z'),
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
        results.errors.push({ record: r });
      }
    }
    return results;
  }

  /**
   * Inserción masiva de inscripciones. Solo procesa estudiantes existentes y
   * materias existentes; no crea usuarios ni materias implícitamente.
   */
  async importEnrollments(records: EnrollmentRecord[]) {
    const results = {
      total: records.length,
      inserted: 0,
      skipped: 0,
      errors: [] as EnrollmentImportError[],
    };

    const rows = records.map((record, index) => ({
      fila: index + 2, // 1 es el encabezado del CSV
      codigoEstudiantil: String(record.codigoEstudiantil ?? '').trim(),
      materiaCodigo: String(record.materiaCodigo ?? '').trim(),
      semestre: String(record.semestre ?? '').trim(),
    }));

    const validRows = rows.filter((row) => {
      if (!row.codigoEstudiantil || !row.materiaCodigo || !row.semestre) {
        results.errors.push({ ...row, reason: 'datos_incompletos' });
        return false;
      }

      if (row.semestre.length > 20) {
        results.errors.push({ ...row, reason: 'semestre_invalido' });
        return false;
      }

      return true;
    });

    if (validRows.length === 0) {
      results.skipped = results.total;
      return results;
    }

    const studentCodes = [
      ...new Set(validRows.map((row) => row.codigoEstudiantil)),
    ];
    const subjectCodes = [
      ...new Set(validRows.map((row) => row.materiaCodigo)),
    ];

    const [usuarios, materias] = await Promise.all([
      this.prisma.usuario.findMany({
        where: { codigoEstudiantil: { in: studentCodes } },
        select: {
          id: true,
          codigoEstudiantil: true,
          rol: true,
        },
      }),
      this.prisma.materia.findMany({
        where: { codigo: { in: subjectCodes } },
        select: { id: true, codigo: true },
      }),
    ]);

    const usuarioMap = new Map(
      usuarios.map((usuario) => [usuario.codigoEstudiantil, usuario]),
    );
    const materiaMap = new Map(
      materias.map((materia) => [materia.codigo, materia]),
    );

    const prepared: Array<{
      fila: number;
      codigoEstudiantil: string;
      materiaCodigo: string;
      semestre: string;
      usuarioId: string;
      materiaId: string;
    }> = [];
    const seen = new Set<string>();

    for (const row of validRows) {
      const usuario = usuarioMap.get(row.codigoEstudiantil);

      if (!usuario) {
        results.errors.push({ ...row, reason: 'estudiante_no_encontrado' });
        continue;
      }

      if (usuario.rol !== RolUsuario.estudiante) {
        results.errors.push({ ...row, reason: 'usuario_no_estudiante' });
        continue;
      }

      const materia = materiaMap.get(row.materiaCodigo);

      if (!materia) {
        results.errors.push({ ...row, reason: 'materia_no_encontrada' });
        continue;
      }

      const key = `${usuario.id}|${materia.id}|${row.semestre}`;

      if (seen.has(key)) {
        results.errors.push({ ...row, reason: 'inscripcion_duplicada' });
        continue;
      }

      seen.add(key);
      prepared.push({
        ...row,
        usuarioId: usuario.id,
        materiaId: materia.id,
      });
    }

    const existingKeys = new Set<string>();

    if (prepared.length > 0) {
      const existentes = await this.prisma.inscripcionMateria.findMany({
        where: {
          usuarioId: { in: [...new Set(prepared.map((row) => row.usuarioId))] },
          semestre: { in: [...new Set(prepared.map((row) => row.semestre))] },
        },
        select: { usuarioId: true, materiaId: true, semestre: true },
      });

      existentes.forEach((inscripcion) => {
        existingKeys.add(
          `${inscripcion.usuarioId}|${inscripcion.materiaId}|${inscripcion.semestre}`,
        );
      });
    }

    const toCreate = prepared.filter((row) => {
      const key = `${row.usuarioId}|${row.materiaId}|${row.semestre}`;

      if (existingKeys.has(key)) {
        results.errors.push({
          fila: row.fila,
          codigoEstudiantil: row.codigoEstudiantil,
          materiaCodigo: row.materiaCodigo,
          semestre: row.semestre,
          reason: 'inscripcion_duplicada',
        });
        return false;
      }

      return true;
    });

    if (toCreate.length > 0) {
      const created = await this.prisma.inscripcionMateria.createMany({
        data: toCreate.map((row) => ({
          usuarioId: row.usuarioId,
          materiaId: row.materiaId,
          semestre: row.semestre,
        })),
        skipDuplicates: true,
      });

      results.inserted = created.count;
    }

    results.skipped = results.total - results.inserted;
    results.errors.sort((first, second) => first.fila - second.fila);

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
