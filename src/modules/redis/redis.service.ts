import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },
    });

    this.client.on('connect', () => {
      this.logger.log('Conexión a Redis establecida exitosamente.');
    });

    this.client.on('error', (err) => {
      this.logger.error('Error al conectar con Redis:', err);
    });

    try {
      const pingResult = await this.client.ping();
      this.logger.log(`Redis PING response: ${pingResult}`);
    } catch (error) {
      this.logger.error('No se pudo hacer PING a Redis en el inicio.', error);
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  // Set con tiempo de expiración opcional en segundos
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  getClient(): Redis {
    return this.client;
  }
}
