import { Injectable, NotFoundException } from "@nestjs/common";
import { BrandsRepository } from "./brands.repository";

@Injectable()
export class BrandsService {
  constructor(private readonly repo: BrandsRepository) {}

  list() { return this.repo.list(); }

  async getBySlug(slug: string) {
    const b = await this.repo.findBySlug(slug);
    if (!b) throw new NotFoundException("Brand not found");
    return b;
  }
}
