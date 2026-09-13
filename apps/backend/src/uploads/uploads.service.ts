import { Injectable, OnModuleInit } from "@nestjs/common";
import { S3Client, PutObjectCommand, GetObjectCommand, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import * as sharp from "sharp";

@Injectable()
export class UploadsService implements OnModuleInit {
  private s3: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET || "truckparts-media";
    // This is the URL a BROWSER can reach to view the image, e.g. http://localhost:9000
    this.publicUrl = process.env.MINIO_PUBLIC_URL || "http://localhost:9000";

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

  // Runs once when the backend starts — makes sure our bucket exists so we
  // never have to think about it manually in MinIO's console.
  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    const key = `products/${randomUUID()}.webp`;

    // Re-encode every upload to WebP and cap dimensions at 2000px - phone
    // photos routinely arrive as multi-MB JPEGs far larger than anything the
    // storefront ever displays, and both changes are visually lossless at
    // normal viewing sizes while cutting typical file size by 80%+.
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
    async getImage(key: string) {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const response = await this.s3.send(command);
    return { stream: response.Body, contentType: response.ContentType };
    }
}