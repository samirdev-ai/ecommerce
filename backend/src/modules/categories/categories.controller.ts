import { Controller, Get, Param } from "@nestjs/common";
import { CategoriesService } from "./categories.service";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get() list() { return this.categories.list(); }

  @Get(":slug")
  getOne(@Param("slug") slug: string) { return this.categories.getBySlug(slug); }
}
