import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";
import { ReviewsRepository } from "./reviews.repository";

@Module({
  imports: [JwtModule.register({})],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewsRepository],
})
export class ReviewsModule {}
