import { CallHandler, ExecutionContext, Injectable, NestInterceptor, UseInterceptors, applyDecorators } from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { CatalogCacheService } from "./catalog-cache.service";

@Injectable()
export class RevalidateCatalogInterceptor implements NestInterceptor {
  constructor(private catalogCache: CatalogCacheService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Only after the handler succeeded: a rejected edit changed nothing.
    return next.handle().pipe(tap(() => this.catalogCache.catalogChanged()));
  }
}

// Put on every admin route that changes what the public catalog shows
// (products, categories, brands, vehicles, imports, review removal).
export const RevalidatesCatalog = () => applyDecorators(UseInterceptors(RevalidateCatalogInterceptor));
