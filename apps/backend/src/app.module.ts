import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./common/prisma/prisma.module";
import { ProductsModule } from "./products/products.module";
import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ProductsModule,
    // Future modules land here as we build them:
    // AuthModule, UsersModule, CategoriesModule, BrandsModule,
    // VehiclesModule, CartModule, OrdersModule, PaymentsModule, ReviewsModule
  ],
  controllers: [AppController],
})
export class AppModule {}
