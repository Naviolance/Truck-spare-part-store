import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@truckparts/prisma";

// This service is injected into every module that needs database access.
// Keeping ONE PrismaClient instance shared across the app is important —
// each PrismaClient manages its own connection pool.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
