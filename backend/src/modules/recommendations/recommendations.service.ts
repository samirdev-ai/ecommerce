import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(userId: string) {
    const viewed = await this.prisma.recentlyViewed.findMany({
      where: { userId },
      include: { product: { include: { category: true } } },
      orderBy: { viewedAt: "desc" },
      take: 5,
    });
    const categoryIds = Array.from(new Set(viewed.map((v) => v.product.categoryId)));
    if (categoryIds.length === 0) {
      return this.prisma.product.findMany({ orderBy: { rating: "desc" }, take: 8, include: { brand: true, category: true } });
    }
    return this.prisma.product.findMany({
      where: { categoryId: { in: categoryIds } },
      orderBy: { rating: "desc" },
      take: 8,
      include: { brand: true, category: true },
    });
  }
}
