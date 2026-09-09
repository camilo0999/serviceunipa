import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { TokenBlacklistQueryDto } from './dto/token-blacklist-query.dto';
import { TokenBlacklistService } from './token-blacklist.service';

@ApiTags('Token Blacklist')
@ApiBearerAuth('JWT-auth')
@Controller('token-blacklist')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TokenBlacklistController {
  constructor(
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  @Get()
  @Roles(RolUsuario.administrador)
  @ApiOperation({ summary: 'Listar registros de tokens revocados' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'usuarioId', required: false, type: String })
  @ApiQuery({ name: 'expiraDesde', required: false, type: String })
  @ApiQuery({ name: 'expiraHasta', required: false, type: String })
  @ApiQuery({ name: 'creadoDesde', required: false, type: String })
  @ApiQuery({ name: 'creadoHasta', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['expiraEn', 'creadoEn'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 403, description: 'Solo administradores.' })
  findAll(@Query() query: TokenBlacklistQueryDto) {
    return this.tokenBlacklistService.findAll(query);
  }

  @Get(':id')
  @Roles(RolUsuario.administrador)
  @ApiOperation({ summary: 'Obtener un token revocado' })
  @ApiResponse({
    status: 404,
    description: 'Registro de token no encontrado.',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tokenBlacklistService.findOne(id);
  }
}
