import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { RecentlyViewedService } from "./recently-viewed.service";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { CurrentUser, type AuthUser } from "@/common/decorators/current-user.decorator";

@UseGuards(JwtGuard)
@Controller("recently-viewed")
export class RecentlyViewedController {
  constructor(private readonly rv: RecentlyViewedService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) { return this.rv.list(user.id); }

  @Post(":productId")
  record(@CurrentUser() user: AuthUser, @Param("productId") productId: string) {
    return this.rv.record(user.id, productId);
  }
}
