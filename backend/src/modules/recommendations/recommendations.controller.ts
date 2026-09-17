import { Controller, Get, UseGuards } from "@nestjs/common";
import { RecommendationsService } from "./recommendations.service";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { CurrentUser, type AuthUser } from "@/common/decorators/current-user.decorator";

@UseGuards(JwtGuard)
@Controller("recommendations")
export class RecommendationsController {
  constructor(private readonly recs: RecommendationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) { return this.recs.forUser(user.id); }
}
