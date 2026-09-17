import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { RecommendationsController } from "./recommendations.controller";
import { RecommendationsService } from "./recommendations.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
