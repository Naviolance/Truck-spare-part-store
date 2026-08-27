import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get("health")
  health() {
    return { status: "ok", service: "truckparts-backend", timestamp: new Date().toISOString() };
  }
}
