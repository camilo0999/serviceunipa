import { PartialType } from '@nestjs/swagger';
import { CreateRutaDto } from './create-ruta.dto';

/**
 * Todos los campos son opcionales: solo se actualiza lo enviado.
 */
export class UpdateRutaDto extends PartialType(CreateRutaDto) {}
