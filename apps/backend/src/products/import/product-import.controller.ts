import { BadRequestException, Body, Controller, Get, HttpCode, Post, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { RevalidatesCatalog } from "../../common/catalog-cache/revalidates-catalog.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { ProductStatus, UserRole } from "@truckparts/prisma";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { ProductImportService } from "./product-import.service";
import { IMPORT_TEMPLATE_CSV } from "./product-import.parser";

const MAX_FILE_BYTES = 2 * 1024 * 1024; // ~5000 rows of normal product data

function csvBuffer(file?: Express.Multer.File): Buffer {
  if (!file) throw new BadRequestException("No file provided");
  if (/\.(xlsx|xls|ods|numbers)$/i.test(file.originalname)) {
    throw new BadRequestException("Please save the spreadsheet as CSV first (File > Save as > CSV) and upload that.");
  }
  // Windows reports .csv as application/vnd.ms-excel, others as text/csv or
  // text/plain — the extension is the reliable signal; the parser does the rest.
  if (!/\.(csv|txt)$/i.test(file.originalname)) {
    throw new BadRequestException("Only .csv files can be imported");
  }
  return file.buffer;
}

@Controller("products/import")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ProductImportController {
  constructor(private importService: ProductImportService) {}

  // The template, with a UTF-8 BOM so Excel opens accents correctly.
  @Get("template")
  template(@Res() res: Response) {
    res
      .set({
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="truckparts-import-template.csv"',
      })
      .send("\uFEFF" + IMPORT_TEMPLATE_CSV);
  }

  // Step 1: what would happen. Writes nothing.
  @Post("preview")
  @HttpCode(200)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_FILE_BYTES, files: 1 } }))
  preview(@UploadedFile() file?: Express.Multer.File) {
    return this.importService.preview(csvBuffer(file));
  }

  // Step 2: apply it — all rows or none.
  @Post("commit")
  @RevalidatesCatalog()
  @HttpCode(200)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_FILE_BYTES, files: 1 } }))
  commit(@UploadedFile() file?: Express.Multer.File, @Body("defaultStatus") defaultStatus?: string) {
    const status = defaultStatus === ProductStatus.DRAFT ? ProductStatus.DRAFT : ProductStatus.PUBLISHED;
    return this.importService.commit(csvBuffer(file), status);
  }
}
