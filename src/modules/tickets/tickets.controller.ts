import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { GenerateTicketDto } from './dto/generate-ticket.dto';
import { ValidateTicketDto } from './dto/validate-ticket.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('generate')
  @Roles(RolUsuario.estudiante)
  @ApiOperation({
    summary: 'Generar un ticket QR para el menú del día (Solo estudiantes)',
  })
  @ApiResponse({ status: 201, description: 'Ticket generado exitosamente.' })
  @ApiResponse({
    status: 403,
    description: 'Estudiante no elegible para el menú.',
  })
  @ApiResponse({
    status: 409,
    description: 'Ticket ya generado para este menú.',
  })
  generate(
    @Request() req: { user: { sub: string } },
    @Body() generateTicketDto: GenerateTicketDto,
  ) {
    const usuarioId = req.user.sub;
    return this.ticketsService.generateTicket(
      usuarioId,
      generateTicketDto.menuDiaId,
    );
  }

}
