import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";
import { CartRepository } from "./cart.repository";

@Module({
  imports: [JwtModule.register({})],
  controllers: [CartController],
  providers: [CartService, CartRepository],
})
export class CartModule {}
