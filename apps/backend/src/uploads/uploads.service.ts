import { Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { S3Client, PutObjectCommand, GetObjectCommand, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import type { Readable } from "stream";
import * as sharpModule from "sharp";
import { imageKey } from "./image-key";

// sharp >= 0.35 types its ESM entry as `export default`, but under this
// project's CommonJS output require("sharp") returns the function itself
// (there is no .default at runtime). So keep the namespace import, which is
// the real function, and only fix its type. Same pattern as cookieParser in main.ts.
const sharp = sharpModule as unknown as typeof sharpModule.default;

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly logger = new Logger(UploadsService.name);
  private s3: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET || "truckparts-media";

    this.s3 = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
      // MinIO ignores this entirely; Cloudflare R2 requires exactly "auto";
      // Backblaze B2 requires the bucket's actual region code (e.g.
      // "us-west-004") — set MINIO_REGION to match whichever provider is
      // actually behind MINIO_ENDPOINT.
      region: process.env.MINIO_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER || "truckparts_admin",
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD || "truckparts_local_password",
      },
      forcePathStyle: true, // required for MinIO (vs AWS's default virtual-hosted style)
    });
  }

  // Makes sure the bucket exists at startup. Storage being down must NOT
  // stop the API from booting — the store can still list products and take
  // orders; only image upload/serving is affected until storage is back.
  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch (err) {
        this.logger.error(`Object storage unreachable at startup (${err instanceof Error ? err.message : err}); continuing without it`);
      }
    }
  }

  // `name` describes the product (name, brand, part number): it becomes the
  // file name, see image-key.ts.
  async uploadImage(file: Express.Multer.File, name?: string): Promise<string> {
    const key = imageKey(name);

    // Re-encode every upload to WebP and cap dimensions at 2000px - phone
    // photos routinely arrive as multi-MB JPEGs far larger than anything the
    // storefront ever displays, and both changes are visually lossless at
    // normal viewing sizes while cutting typical file size by 80%+. Decoding
    // also proves the file really is an image, whatever its MIME type claimed.
    const optimized = await sharp(file.buffer)
      .rotate() // bake in EXIF orientation before the metadata is stripped
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: optimized,
        ContentType: "image/webp",
      }),
    );

    const backendUrl = process.env.BACKEND_PUBLIC_URL || "http://localhost:4000";
    return `${backendUrl}/uploads/file/${key}`;
  }

  // NotFoundException for a missing key (S3's NoSuchKey) instead of letting
  // it surface as a 500; any other storage failure still propagates.
  async getImage(key: string): Promise<{ stream: Readable; contentType?: string; contentLength?: number }> {
    try {
      const response = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return {
        stream: response.Body as Readable,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
      };
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "NoSuchKey" || name === "NotFound") throw new NotFoundException("Image not found");
      throw err;
    }
  }
}
