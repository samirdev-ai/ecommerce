import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: { email: string; passwordHash: string; firstName: string; lastName?: string }) {
    return this.prisma.user.create({ data });
  }
}
