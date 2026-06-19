import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import PDFDocument from 'pdfkit';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async ticketsHistory(start?: string, end?: string) {
    const where: any = {};
    if (start) where.gte = new Date(start);
    if (end) where.lte = new Date(end);

    const tickets = await this.prisma.ticket.findMany({
      where: start || end ? { creadoEn: where } : undefined,
      include: { usuario: true, menuDia: true },
      orderBy: { creadoEn: 'desc' },
    });
    return tickets;
  }

  async ticketsHistoryCsv(start?: string, end?: string) {
    const tickets = await this.ticketsHistory(start, end);
    const headers = ['id', 'usuarioCodigo', 'usuarioNombre', 'menuDiaId', 'tipoComida', 'fecha', 'usado', 'creadoEn'];
    const lines = [headers.join(',')];
    for (const t of tickets) {
      const row = [
        t.id,
        t.usuario?.codigoEstudiantil || '',
        `${t.usuario?.nombre || ''} ${t.usuario?.apellido || ''}`.trim(),
        t.menuDiaId,
        t.menuDia?.tipoComida || '',
        t.menuDia?.fecha?.toISOString().split('T')[0] || '',
        t.usado ? '1' : '0',
        t.creadoEn.toISOString(),
      ];
      lines.push(row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
    }
    return lines.join('\n');
  }

  async ticketsHistoryPdf(start?: string, end?: string) {
    const tickets = await this.ticketsHistory(start, end);
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {});

    doc.fontSize(14).text('Histórico de Tickets', { align: 'center' });
    doc.moveDown();
    for (const t of tickets) {
      doc.fontSize(10).text(`ID: ${t.id}`);
      doc.text(`Usuario: ${t.usuario?.codigoEstudiantil || ''} - ${t.usuario?.nombre || ''} ${t.usuario?.apellido || ''}`);
      doc.text(`MenuDia: ${t.menuDiaId} ${t.menuDia?.tipoComida || ''} ${t.menuDia?.fecha?.toISOString().split('T')[0] || ''}`);
      doc.text(`Usado: ${t.usado ? 'Sí' : 'No'}  CreadoEn: ${t.creadoEn.toISOString()}`);
      doc.moveDown();
    }
    doc.end();
    await new Promise((res) => doc.on('end', res));
    return Buffer.concat(chunks);
  }
}
