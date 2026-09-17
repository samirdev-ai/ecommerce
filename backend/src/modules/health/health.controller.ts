import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { RedisService } from "@/infra/cache/redis.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    let db = "up";
    let cache = "up";
    try { await this.prisma.$queryRaw`SELECT 1`; } catch { db = "down"; }
    try { await this.redis.client.ping(); } catch { cache = "down"; }
    return { status: db === "up" && cache === "up" ? "ok" : "degraded", db, cache };
  }
}
