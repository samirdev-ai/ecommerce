import { Controller, Get, Param, Query } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { ListProductsQuerySchema, type ListProductsQuery } from "./dto/list-products.dto";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";

@Controller("products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(ListProductsQuerySchema)) q: ListProductsQuery) {
    return this.products.list(q);
  }

  @Get(":slug")
  getOne(@Param("slug") slug: string) {
    return this.products.getBySlug(slug);
  }
}
