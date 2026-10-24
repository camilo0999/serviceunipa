import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_RECORDS = 5000;
const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
  'application/octet-stream',
]);

@ApiTags('Import')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.administrador)
@Controller('import')
export class ImportController {
  constructor(private importService: ImportService) {}

  @Post('schedules')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async importSchedules(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Se requiere un archivo CSV');

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('El archivo supera el límite de 5 MB');
    }

    const filename = String(file.originalname || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(file.mimetype) && !filename.endsWith('.csv')) {
      throw new BadRequestException('Solo se permiten archivos CSV');
    }

    const records = this.importService.parseCsv(file.buffer);
    if (records.length > MAX_RECORDS) {
      throw new BadRequestException(
        `El archivo supera el máximo de ${MAX_RECORDS} registros`,
      );
    }

    return this.importService.importSchedules(records);
  }
}
