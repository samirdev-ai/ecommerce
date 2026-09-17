import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from "@nestjs/common";
import Redis from "ioredis";
import { getEnv } from "@/config/env";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor() {
    this.client = new Redis(getEnv().REDIS_URL, { lazyConnect: true });
  }

  async onModuleInit() {
    await this.client.connect();
    this.logger.log("Redis connected");
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
