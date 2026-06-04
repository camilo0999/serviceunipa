import { Controller, Post, Body } from '@nestjs/common';
import { RecuperacionPasswordService } from './recuperacion-password.service';

@Controller('auth/password')
export class RecuperacionPasswordController {
  constructor(
    private readonly recuperacionPasswordService: RecuperacionPasswordService,
  ) {}

  @Post('forgot')
  requestReset(@Body('email') email: string) {
    return this.recuperacionPasswordService.requestReset(email);
  }

  @Post('reset')
  resetPassword(
    @Body('token') token: string,
    @Body('new_password') newPassword: string,
  ) {
    return this.recuperacionPasswordService.resetPassword(token, newPassword);
  }
}
