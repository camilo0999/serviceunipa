import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TokenBlacklistService {
  constructor(private prisma: PrismaService) {}

  async cleanup() {
    return this.prisma.tokenBlacklist.deleteMany({
      where: {
        expiraEn: { lt: new Date() },
      },
    });
  }
}
