import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByProductSlug(slug: string) {
    return this.prisma.review.findMany({
      where: { product: { slug } },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  create(userId: string, productId: string, dto: { rating: number; title?: string; body?: string }) {
    return this.prisma.review.create({
      data: { userId, productId, rating: dto.rating, title: dto.title, body: dto.body },
    });
  }
}
