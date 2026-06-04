import { Module } from '@nestjs/common';
import { AuditoriaInterceptor } from './auditoria.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditoriaInterceptor,
    },
  ],
})
export class AuditoriaModule {}
