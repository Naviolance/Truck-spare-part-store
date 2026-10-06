import { Global, Module } from "@nestjs/common";
import { CatalogCacheService } from "./catalog-cache.service";
import { RevalidateCatalogInterceptor } from "./revalidates-catalog.decorator";

@Global()
@Module({
  providers: [CatalogCacheService, RevalidateCatalogInterceptor],
  exports: [CatalogCacheService, RevalidateCatalogInterceptor],
})
export class CatalogCacheModule {}
