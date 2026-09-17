import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { RecentlyViewedController } from "./recently-viewed.controller";
import { RecentlyViewedService } from "./recently-viewed.service";
import { RecentlyViewedRepository } from "./recently-viewed.repository";

@Module({
  imports: [JwtModule.register({})],
  controllers: [RecentlyViewedController],
  providers: [RecentlyViewedService, RecentlyViewedRepository],
})
export class RecentlyViewedModule {}
