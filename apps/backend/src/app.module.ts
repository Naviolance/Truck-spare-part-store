import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { join } from "path";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { PrismaModule } from "./common/prisma/prisma.module";
import { ProductsModule } from "./products/products.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CategoriesModule } from "./categories/categories.module";
import { BrandsModule } from "./brands/brands.module";
import { AdminModule } from "./admin/admin.module";
import { AppController } from "./app.controller";
import { UploadsModule } from "./uploads/uploads.module";
import { CartModule } from "./cart/cart.module";
import { OrdersModule } from "./orders/orders.module";
import { VehiclesModule } from "./vehicles/vehicles.module";
import { PaymentsModule } from "./payments/payments.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { CouponsModule } from "./coupons/coupons.module";
import { MailModule } from "./mail/mail.module";
import { ProductRequestsModule } from "./product-requests/product-requests.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, "../../../.env") }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    ProductsModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    BrandsModule,
    AdminModule,
    UploadsModule,
    CartModule,
    OrdersModule,
    VehiclesModule,
    PaymentsModule,
    ReviewsModule,
    CouponsModule,
    MailModule,
    ProductRequestsModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}