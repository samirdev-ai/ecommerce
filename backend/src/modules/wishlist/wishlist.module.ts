import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { WishlistController } from "./wishlist.controller";
import { WishlistService } from "./wishlist.service";
import { WishlistRepository } from "./wishlist.repository";

@Module({
  imports: [JwtModule.register({})],
  controllers: [WishlistController],
  providers: [WishlistService, WishlistRepository],
})
export class WishlistModule {}
