import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import * as cookieParser from "cookie-parser";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

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
  app.useGlobalFilters(new AllExceptionsFilter());

  // Allows localhost, any private-LAN origin on port 3000 (phone on the same
  // Wi-Fi, e.g. http://<lan-ip>:3000), and any ngrok tunnel domain (dynamic
  // subdomain each run, so we match the domain suffix rather than hardcoding
  // one URL) — all for local dev/mobile testing, not a production concern.
  const DEV_ORIGIN_RE =
    /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:3000)?$|^https:\/\/[a-z0-9-]+\.ngrok-free\.(app|dev)$|^https:\/\/[a-z0-9-]+\.ngrok\.io$/;
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || DEV_ORIGIN_RE.test(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  });

  const port = process.env.BACKEND_PORT || 4000;
  await app.listen(port);
  console.log(`🚚 TruckParts backend running on http://localhost:${port}`);
  console.log(`   Health check: http://localhost:${port}/health`);
}

bootstrap();