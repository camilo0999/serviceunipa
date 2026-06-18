import { PartialType } from '@nestjs/swagger';
import { CreateMenuDiaDto } from './create-menu-dia.dto';

export class UpdateMenuDiaDto extends PartialType(CreateMenuDiaDto) {}
