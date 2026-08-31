import { Injectable, OnModuleInit } from "@nestjs/common";
import { S3Client, PutObjectCommand, GetObjectCommand, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

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
      region: "us-east-1", // MinIO ignores this but the SDK requires a value
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
    const extension = file.originalname.split(".").pop();
    const key = `products/${randomUUID()}.${extension}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
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