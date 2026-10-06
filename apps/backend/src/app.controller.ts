import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";

@Controller()
export class AppController {
  // clientIp echoes the caller's own IP as Express resolved it, so TRUST_PROXY
  // can be checked in production: open /health (or /api/backend/health via the
  // frontend) and it should show your real public IP, not a proxy's.
  @Get("health")
  health(@Req() req: Request) {
    return {
      status: "ok",
      service: "truckparts-backend",
      timestamp: new Date().toISOString(),
      clientIp: req.ip,
    };
  }
}
