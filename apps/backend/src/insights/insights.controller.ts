import { Body, Controller, Get, HttpCode, ParseIntPipe, DefaultValuePipe, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { UserRole } from "@truckparts/prisma";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { InsightEventDto } from "./dto/insight-event.dto";
import { InsightsService } from "./insights.service";

@Controller("insights")
export class InsightsController {
  constructor(private insights: InsightsService) {}

  // Sent by the storefront (lib/analytics.ts) for each search and WhatsApp
  // click. Public, so tightly throttled per visitor.
  @Post("events")
  @HttpCode(204)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async record(@Body() event: InsightEventDto) {
    await this.insights.record(event);
  }

  @Get("summary")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  summary(@Query("days", new DefaultValuePipe(30), ParseIntPipe) days: number) {
    return this.insights.summary(Math.min(365, Math.max(1, days)));
  }
}
