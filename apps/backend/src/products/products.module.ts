import { Module } from "@nestjs/common";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { ProductImportController } from "./import/product-import.controller";
import { ProductImportService } from "./import/product-import.service";

@Module({
  // Import routes first so /products/:slug-style routes can never capture them.
  controllers: [ProductImportController, ProductsController],
  providers: [ProductsService, ProductImportService],
})
export class ProductsModule {}
