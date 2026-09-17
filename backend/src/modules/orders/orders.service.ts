import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { OrdersRepository } from "./orders.repository";
import { CartRepository } from "../cart/cart.repository";

@Injectable()
export class OrdersService {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly carts: CartRepository,
  ) {}

  list(userId: string) { return this.orders.listByUser(userId); }

  async getOne(userId: string, id: string) {
    const order = await this.orders.findById(id);
    if (!order || order.userId !== userId) throw new NotFoundException("Order not found");
    return order;
  }

  async checkout(userId: string) {
    const cart = await this.carts.findByUserId(userId);
    if (!cart || cart.items.length === 0) throw new BadRequestException("Cart is empty");
    const items = cart.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.product.priceAmount,
    }));
    const order = await this.orders.create(userId, items);
    await this.carts.clear(cart.id);
    return order;
  }
}
