import { Injectable } from "@nestjs/common";
import { WishlistRepository } from "./wishlist.repository";

@Injectable()
export class WishlistService {
  constructor(private readonly repo: WishlistRepository) {}

  list(userId: string) { return this.repo.list(userId); }
  add(userId: string, productId: string) { return this.repo.add(userId, productId); }
  remove(userId: string, productId: string) { return this.repo.remove(userId, productId); }
}
