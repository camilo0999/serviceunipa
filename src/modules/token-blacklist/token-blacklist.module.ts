import { Module } from '@nestjs/common';
import { TokenBlacklistService } from './token-blacklist.service';
import { TokenBlacklistController } from './token-blacklist.controller';

@Module({
  controllers: [TokenBlacklistController],
  providers: [TokenBlacklistService],
  exports: [TokenBlacklistService],
})
export class TokenBlacklistModule {}
