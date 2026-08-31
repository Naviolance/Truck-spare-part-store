import {
  Controller,
  Post,
  Get,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { UploadsService } from "./uploads.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "@truckparts/prisma";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

@Controller("uploads")
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post("image")
  @UseInterceptors(FileInterceptor("file"))
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file provided");
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException("Only JPEG, PNG, or WEBP images are allowed");
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException("Image must be under 5MB");
    }

    const url = await this.uploadsService.uploadImage(file);
    return { url };
  }

  // Public — no guard — anyone needs to be able to view product images.
    @Get("file/:key(*)")
    async getFile(@Param("key") key: string, @Res() res: Response) {
    const { stream, contentType } = await this.uploadsService.getImage(key);
    res.set("Content-Type", contentType || "application/octet-stream");
    (stream as any).pipe(res);
    }
}