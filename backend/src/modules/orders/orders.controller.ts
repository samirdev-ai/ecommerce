import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { CurrentUser, type AuthUser } from "@/common/decorators/current-user.decorator";

@UseGuards(JwtGuard)
@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  checkout(@CurrentUser() user: AuthUser) { return this.orders.checkout(user.id); }

  @Get()
  list(@CurrentUser() user: AuthUser) { return this.orders.list(user.id); }

  @Get(":id")
  getOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.orders.getOne(user.id, id);
  }
}
