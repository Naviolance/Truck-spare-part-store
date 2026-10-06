import { Controller, Get, Req, ServiceUnavailableException } from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "./common/prisma/prisma.service";

@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  // Liveness: is the process up? Use this for the HOST's health check
  // (Railway): restarting the API wouldn't fix a database outage, so it
  // must not depend on the database.
  //
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

  // Readiness: can it actually serve requests (database reachable)? Point
  // an external uptime monitor here so a database outage pages someone.
  @Get("health/ready")
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", database: "ok" };
    } catch {
      throw new ServiceUnavailableException({ status: "error", database: "unreachable" });
    }
  }
}
