import { Injectable, NotFoundException } from "@nestjs/common";
import { ProductsRepository } from "./products.repository";
import { toProductResponse } from "./product.mapper";
import type { ListProductsQuery } from "./dto/list-products.dto";

@Injectable()
export class ProductsService {
  constructor(private readonly repo: ProductsRepository) {}

  async list(q: ListProductsQuery) {
    const { items, total } = await this.repo.list(q);
    return {
      items: items.map(toProductResponse),
      total,
      page: q.page,
      limit: q.limit,
      pageCount: Math.ceil(total / q.limit),
    };
  }

  async getBySlug(slug: string) {
    const product = await this.repo.findBySlug(slug);
    if (!product) throw new NotFoundException("Product not found");
    return toProductResponse(product);
  }
}
