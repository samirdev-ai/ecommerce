import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import type { Prisma } from "@prisma/client";
import type { ListProductsQuery } from "./dto/list-products.dto";

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ListProductsQuery) {
    const where: Prisma.ProductWhereInput = {};
    if (q.category) where.category = { slug: q.category };
    if (q.brand) where.brand = { slug: q.brand };
    if (q.minPrice !== undefined || q.maxPrice !== undefined) {
      where.priceAmount = {};
      if (q.minPrice !== undefined) where.priceAmount.gte = q.minPrice;
      if (q.maxPrice !== undefined) where.priceAmount.lte = q.maxPrice;
    }
    if (q.minRating !== undefined) where.rating = { gte: q.minRating };
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: "insensitive" } },
        { description: { contains: q.search, mode: "insensitive" } },
      ];
    }
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      q.sort === "price_asc" ? { priceAmount: "asc" }
      : q.sort === "price_desc" ? { priceAmount: "desc" }
      : q.sort === "rating" ? { rating: "desc" }
      : q.sort === "newest" ? { createdAt: "desc" }
      : { reviewCount: "desc" };
    const skip = (q.page - 1) * q.limit;
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({ where, orderBy, skip, take: q.limit, include: { brand: true, category: true } }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total };
  }

  findBySlug(slug: string) {
    return this.prisma.product.findUnique({
      where: { slug },
      include: { brand: true, category: true },
    });
  }
}
