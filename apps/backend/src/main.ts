import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import * as cookieParser from "cookie-parser";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Default body size limit is too small for image uploads — raise it.
  // The `verify` callback stashes the raw bytes for webhook signature checks,
  // since Notch Pay signs the exact raw payload, not our parsed JSON object.
  app.use(
    json({
      limit: "10mb",
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString();
      },
    }),
  );
  app.use(urlencoded({ extended: true, limit: "10mb" }));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
  app.use((cookieParser as unknown as () => any)());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableCors({
    origin: "http://localhost:3000",
    credentials: true,
  });

  const port = process.env.BACKEND_PORT || 4000;
  await app.listen(port);
  console.log(`🚚 TruckParts backend running on http://localhost:${port}`);
  console.log(`   Health check: http://localhost:${port}/health`);
}

bootstrap();