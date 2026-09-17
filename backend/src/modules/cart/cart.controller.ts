import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CartService } from "./cart.service";
import { AddCartItemSchema, UpdateCartItemSchema, type AddCartItemDto, type UpdateCartItemDto } from "./dto/cart.dto";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { CurrentUser, type AuthUser } from "@/common/decorators/current-user.decorator";

@UseGuards(JwtGuard)
@Controller("cart")
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) { return this.cart.get(user.id); }

  @Post("items")
  add(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(AddCartItemSchema)) dto: AddCartItemDto) {
    return this.cart.addItem(user.id, dto.productId, dto.quantity);
  }

  @Patch("items/:productId")
  update(@CurrentUser() user: AuthUser, @Param("productId") productId: string, @Body(new ZodValidationPipe(UpdateCartItemSchema)) dto: UpdateCartItemDto) {
    return this.cart.updateItem(user.id, productId, dto.quantity);
  }

  @Delete("items/:productId")
  remove(@CurrentUser() user: AuthUser, @Param("productId") productId: string) {
    return this.cart.removeItem(user.id, productId);
  }

  @Delete()
  clear(@CurrentUser() user: AuthUser) { return this.cart.clear(user.id); }
}
