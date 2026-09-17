import { Injectable, NotFoundException } from "@nestjs/common";
import { ReviewsRepository } from "./reviews.repository";
import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class ReviewsService {
  constructor(
    private readonly repo: ReviewsRepository,
    private readonly prisma: PrismaService,
  ) {}

  list(productSlug: string) { return this.repo.listByProductSlug(productSlug); }

  async createForSlug(userId: string, productSlug: string, dto: { rating: number; title?: string; body?: string }) {
    const product = await this.prisma.product.findUnique({ where: { slug: productSlug } });
    if (!product) throw new NotFoundException("Product not found");
    return this.repo.create(userId, product.id, dto);
  }
}
