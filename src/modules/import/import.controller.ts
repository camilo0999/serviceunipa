import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('Import')
@Controller('import')
export class ImportController {
  constructor(private importService: ImportService) {}

  @Post('schedules')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async importSchedules(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Se requiere un archivo CSV');
    const records = this.importService.parseCsv(file.buffer);
    const result = await this.importService.importSchedules(records);
    return result;
  }
}
