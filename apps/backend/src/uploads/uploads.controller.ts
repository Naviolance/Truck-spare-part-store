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
  NotFoundException,
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

// Only keys this service itself creates (uploadImage): products/<uuid>.webp.
// Anything else in the bucket is never served through this public route.
const IMAGE_KEY_RE = /^products\/[0-9a-f-]{36}\.webp$/;

// Keys are random UUIDs and never overwritten, so an image at a given URL
// can never change: browsers and CDNs may cache it for a year without
// revalidating. That's what keeps repeat views off the backend and storage.
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

// Served with a 404 (or 503) status instead of a broken-image icon, so a
// product card degrades to a tidy grey box.
function placeholderSvg(label: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" role="img" aria-label="${label}">
<rect width="400" height="400" fill="#e7e5e4"/>
<g fill="none" stroke="#78716c" stroke-width="8"><rect x="130" y="140" width="140" height="110" rx="10"/><circle cx="175" cy="180" r="14"/><path d="M140 240l45-45 30 30 20-20 25 35"/></g>
<text x="200" y="290" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#57534e">${label}</text>
</svg>`;
}

@Controller("uploads")
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  // `limits` makes multer abort the upload while it's still streaming in
  // (413 Payload Too Large) instead of buffering an arbitrarily large file
  // into memory first and only then checking its size.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post("image")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_SIZE_BYTES, files: 1, fields: 5 } }))
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file provided");
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException("Only JPEG, PNG, or WEBP images are allowed");
    }

    try {
      const url = await this.uploadsService.uploadImage(file);
      return { url };
    } catch (err) {
      // sharp couldn't decode it: the bytes aren't really an image.
      if (err instanceof Error && /unsupported image format|Input buffer/i.test(err.message)) {
        throw new BadRequestException("That file isn't a valid image");
      }
      throw err;
    }
  }

  // Public — no guard — anyone needs to be able to view product images.
  @Get("file/:key(*)")
  async getFile(@Param("key") key: string, @Res() res: Response) {
    try {
      if (!IMAGE_KEY_RE.test(key)) throw new NotFoundException();
      const { stream, contentType, contentLength } = await this.uploadsService.getImage(key);
      res.set({
        "Content-Type": contentType || "image/webp",
        "Cache-Control": IMMUTABLE_CACHE,
        ...(contentLength !== undefined && { "Content-Length": String(contentLength) }),
      });
      stream.on("error", () => res.destroy());
      stream.pipe(res);
    } catch (err) {
      const notFound = err instanceof NotFoundException;
      res
        .status(notFound ? 404 : 503)
        // Short cache for "missing" (it may be fixed by re-uploading), none
        // for an outage so the real image shows as soon as storage is back.
        .set({ "Content-Type": "image/svg+xml", "Cache-Control": notFound ? "public, max-age=300" : "no-store" })
        .send(placeholderSvg(notFound ? "Image not found" : "Image unavailable"));
    }
  }
}
