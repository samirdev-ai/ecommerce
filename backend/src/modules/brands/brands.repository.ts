import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class BrandsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list() { return this.prisma.brand.findMany({ orderBy: { name: "asc" } }); }

  findBySlug(slug: string) {
    return this.prisma.brand.findUnique({ where: { slug } });
  }
}
