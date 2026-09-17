import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
  }

  create(userId: string, items: { productId: string; quantity: number; unitPrice: number }[]) {
    const total = items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);
    return this.prisma.order.create({
      data: {
        userId,
        total,
        status: "pending",
        items: { create: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })) },
      },
      include: { items: { include: { product: true } } },
    });
  }
}
