import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrdersRepository } from "./orders.repository";
import { CartRepository } from "../cart/cart.repository";

@Module({
  imports: [JwtModule.register({})],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, CartRepository],
})
export class OrdersModule {}
