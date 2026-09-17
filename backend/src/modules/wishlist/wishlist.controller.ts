import { Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { WishlistService } from "./wishlist.service";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { CurrentUser, type AuthUser } from "@/common/decorators/current-user.decorator";

@UseGuards(JwtGuard)
@Controller("wishlist")
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) { return this.wishlist.list(user.id); }

  @Post(":productId")
  add(@CurrentUser() user: AuthUser, @Param("productId") productId: string) {
    return this.wishlist.add(user.id, productId);
  }

  @Delete(":productId")
  remove(@CurrentUser() user: AuthUser, @Param("productId") productId: string) {
    return this.wishlist.remove(user.id, productId);
  }
}
