import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Reject requests with unexpected fields, auto-transform payloads to DTO types
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Allow the Next.js frontend (running on a different port) to call this API
  app.enableCors({ origin: process.env.NEXT_PUBLIC_API_URL ? true : "http://localhost:3000" });

  const port = process.env.BACKEND_PORT || 4000;
  await app.listen(port);
  console.log(`🚚 TruckParts backend running on http://localhost:${port}`);
  console.log(`   Health check: http://localhost:${port}/health`);
}

bootstrap();
