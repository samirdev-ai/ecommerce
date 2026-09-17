import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.cart.findFirst({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
  }

  createForUser(userId: string) {
    return this.prisma.cart.create({
      data: { userId },
      include: { items: { include: { product: true } } },
    });
  }

  async ensureForUser(userId: string) {
    const existing = await this.findByUserId(userId);
    return existing ?? (await this.createForUser(userId));
  }

  upsertItem(cartId: string, productId: string, quantity: number) {
    return this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId, productId } },
      create: { cartId, productId, quantity },
      update: { quantity },
    });
  }

  removeItem(cartId: string, productId: string) {
    return this.prisma.cartItem.deleteMany({ where: { cartId, productId } });
  }

  clear(cartId: string) {
    return this.prisma.cartItem.deleteMany({ where: { cartId } });
  }
}
