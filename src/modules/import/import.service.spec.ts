import { ImportService } from './import.service';

describe('ImportService', () => {
  const prismaMock: any = {} as any;
  const svc = new ImportService(prismaMock as any);

  it('parses CSV with headers', () => {
    const csv = 'codigoEstudiantil,materiaNombre,semestre\n201234,mate1,2026-1\n';
    const buf = Buffer.from(csv, 'utf8');
    const records = svc.parseCsv(buf);
    expect(records).toHaveLength(1);
    expect(records[0].codigoEstudiantil).toBe('201234');
  });
});
