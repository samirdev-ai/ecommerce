import { Injectable } from "@nestjs/common";
import { CartRepository } from "./cart.repository";

@Injectable()
export class CartService {
  constructor(private readonly repo: CartRepository) {}

  async get(userId: string) {
    const cart = await this.repo.ensureForUser(userId);
    return this.summarize(cart);
  }

  async addItem(userId: string, productId: string, quantity: number) {
    const cart = await this.repo.ensureForUser(userId);
    const existing = cart.items.find((i) => i.productId === productId);
    const nextQty = (existing?.quantity ?? 0) + quantity;
    await this.repo.upsertItem(cart.id, productId, nextQty);
    return this.get(userId);
  }

  async updateItem(userId: string, productId: string, quantity: number) {
    const cart = await this.repo.ensureForUser(userId);
    if (quantity <= 0) await this.repo.removeItem(cart.id, productId);
    else await this.repo.upsertItem(cart.id, productId, quantity);
    return this.get(userId);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.repo.ensureForUser(userId);
    await this.repo.removeItem(cart.id, productId);
    return this.get(userId);
  }

  async clear(userId: string) {
    const cart = await this.repo.ensureForUser(userId);
    await this.repo.clear(cart.id);
    return this.get(userId);
  }

  private summarize(cart: { items: Array<{ productId: string; quantity: number; product: { priceAmount: number; priceCurrency: string; name: string; image: string; slug: string } }> }) {
    const items = cart.items.map((i) => ({
      productId: i.productId,
      slug: i.product.slug,
      name: i.product.name,
      image: i.product.image,
      unitPrice: i.product.priceAmount,
      currency: i.product.priceCurrency,
      quantity: i.quantity,
      lineTotal: i.product.priceAmount * i.quantity,
    }));
    const itemCount = items.reduce((n, i) => n + i.quantity, 0);
    const subtotal = items.reduce((n, i) => n + i.lineTotal, 0);
    return { items, itemCount, subtotal, currency: "USD" };
  }
}
