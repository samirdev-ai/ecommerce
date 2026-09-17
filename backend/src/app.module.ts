import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module";
import { DatabaseModule } from "./infra/database/database.module";
import { CacheModule } from "./infra/cache/cache.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ProductsModule } from "./modules/products/products.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { BrandsModule } from "./modules/brands/brands.module";
import { CartModule } from "./modules/cart/cart.module";
import { WishlistModule } from "./modules/wishlist/wishlist.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { RecentlyViewedModule } from "./modules/recently-viewed/recently-viewed.module";
import { RecommendationsModule } from "./modules/recommendations/recommendations.module";
import { NewsletterModule } from "./modules/newsletter/newsletter.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CacheModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    BrandsModule,
    CartModule,
    WishlistModule,
    OrdersModule,
    ReviewsModule,
    RecentlyViewedModule,
    RecommendationsModule,
    NewsletterModule,
    HealthModule,
  ],
})
export class AppModule {}
