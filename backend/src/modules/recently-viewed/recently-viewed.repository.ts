import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class RecentlyViewedRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, limit = 20) {
    return this.prisma.recentlyViewed.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { viewedAt: "desc" },
      take: limit,
    });
  }

  record(userId: string, productId: string) {
    return this.prisma.recentlyViewed.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: { viewedAt: new Date() },
    });
  }
}
