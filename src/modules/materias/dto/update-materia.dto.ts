import { PartialType } from '@nestjs/swagger';
import { CreateMateriaDto } from './create-materia.dto';

/**
 * Todos los campos son opcionales: solo se actualiza lo enviado.
 */
export class UpdateMateriaDto extends PartialType(CreateMateriaDto) {}
