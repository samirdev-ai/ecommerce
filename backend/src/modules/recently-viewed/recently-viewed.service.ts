import { Injectable } from "@nestjs/common";
import { RecentlyViewedRepository } from "./recently-viewed.repository";

@Injectable()
export class RecentlyViewedService {
  constructor(private readonly repo: RecentlyViewedRepository) {}
  list(userId: string) { return this.repo.list(userId); }
  record(userId: string, productId: string) { return this.repo.record(userId, productId); }
}
