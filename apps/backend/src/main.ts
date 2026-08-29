import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
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