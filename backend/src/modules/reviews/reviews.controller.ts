import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ReviewsService } from "./reviews.service";
import { CreateReviewSchema, type CreateReviewDto } from "./dto/review.dto";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import { JwtGuard } from "@/common/guards/jwt.guard";
import { CurrentUser, type AuthUser } from "@/common/decorators/current-user.decorator";

@Controller("products/:slug/reviews")
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(@Param("slug") slug: string) { return this.reviews.list(slug); }

  @UseGuards(JwtGuard)
  @Post()
  create(@CurrentUser() user: AuthUser, @Param("slug") slug: string, @Body(new ZodValidationPipe(CreateReviewSchema)) dto: CreateReviewDto) {
    return this.reviews.createForSlug(user.id, slug, dto);
  }
}
