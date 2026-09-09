import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class SesionesQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;

  @IsUUID()
  @IsOptional()
  usuarioId?: string;

  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  @IsOptional()
  revocada?: boolean;

  @IsDateString()
  @IsOptional()
  expiraDesde?: string;

  @IsDateString()
  @IsOptional()
  expiraHasta?: string;

  @IsDateString()
  @IsOptional()
  creadoDesde?: string;

  @IsDateString()
  @IsOptional()
  creadoHasta?: string;

  @IsIn(['expiraEn', 'creadoEn'])
  @IsOptional()
  sortBy: 'expiraEn' | 'creadoEn' = 'creadoEn';

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder: 'asc' | 'desc' = 'desc';
}
