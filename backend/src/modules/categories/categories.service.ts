import { Injectable, NotFoundException } from "@nestjs/common";
import { CategoriesRepository } from "./categories.repository";

@Injectable()
export class CategoriesService {
  constructor(private readonly repo: CategoriesRepository) {}

  list() { return this.repo.list(); }

  async getBySlug(slug: string) {
    const c = await this.repo.findBySlug(slug);
    if (!c) throw new NotFoundException("Category not found");
    return c;
  }
}
