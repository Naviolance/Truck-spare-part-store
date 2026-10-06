import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from "@nestjs/common";
import { RevalidatesCatalog } from "../common/catalog-cache/revalidates-catalog.decorator";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { QueryProductsDto } from "./dto/query-products.dto";
import { AdminProductsQueryDto } from "./dto/admin-products-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "@truckparts/prisma";

const MAX_RANKED_LIMIT = 24;

// A non-numeric or out-of-range ?limit= should fall back to the service's
// own default, not produce NaN — Number("abc") is NaN, which is a defined
// value, so a naive `limit ? Number(limit) : undefined` would pass NaN
// straight through to Prisma's `take`, which throws.
function parseLimit(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return undefined;
  return Math.min(parsed, MAX_RANKED_LIMIT);
}

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get("most-searched")
  findMostSearched(@Query("limit") limit?: string) {
    return this.productsService.findMostSearched(parseLimit(limit));
  }

  @Get("most-purchased")
  findMostPurchased(@Query("limit") limit?: string) {
    return this.productsService.findMostPurchased(parseLimit(limit));
  }

  // Published products' slug + last change for the sitemaps, one file
  // (?chunk=0,1,...) at a time; /sitemap/info says how many files there are.
  // Declared before ":slug" so they aren't captured by it.
  @Get("sitemap/info")
  sitemapInfo() {
    return this.productsService.sitemapInfo();
  }

  @Get("sitemap")
  sitemap(@Query("chunk", new DefaultValuePipe(0), ParseIntPipe) chunk: number) {
    return this.productsService.sitemap(Math.max(0, chunk));
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.productsService.findOne(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get("admin/all")
  findAllAdmin(@Query() query: AdminProductsQueryDto) {
    return this.productsService.findAllAdmin(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get("admin/:id")
  findOneAdmin(@Param("id") id: string) {
    return this.productsService.findByIdAdmin(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @RevalidatesCatalog()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  @RevalidatesCatalog()
  update(@Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  @RevalidatesCatalog()
  remove(@Param("id") id: string) {
    return this.productsService.remove(id);
  }
}