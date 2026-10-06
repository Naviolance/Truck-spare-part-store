import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { slugify } from "../common/utils/slugify";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async getManufacturers() {
    const rows = await this.prisma.vehicle.findMany({
      select: { manufacturer: true },
      distinct: ["manufacturer"],
      orderBy: { manufacturer: "asc" },
    });
    return rows.map((r) => r.manufacturer);
  }

  async getModels(manufacturer: string) {
    const rows = await this.prisma.vehicle.findMany({
      where: { manufacturer },
      select: { model: true },
      distinct: ["model"],
      orderBy: { model: "asc" },
    });
    return rows.map((r) => r.model);
  }

  // Returns the specific stored configurations (year range + engine) for a
  // manufacturer/model — e.g. a truck might have two engine options on file.
  async getConfigs(manufacturer: string, model: string) {
    return this.prisma.vehicle.findMany({
      where: { manufacturer, model },
      orderBy: { yearStart: "desc" },
    });
  }

  // Every make and model with how many published products fit it, plus URL
  // slugs — feeds the /trucks landing pages and the sitemap in one call.
  // Counts let the frontend skip (noindex) truck pages with nothing to show.
  async catalog() {
    const rows = await this.prisma.$queryRaw<{ manufacturer: string; model: string; products: number }[]>`
      SELECT v.manufacturer, v.model, count(DISTINCT p.id)::int AS products
      FROM vehicles v
      LEFT JOIN product_compatibility pc ON pc."vehicleId" = v.id
      LEFT JOIN products p ON p.id = pc."productId" AND p.status = 'PUBLISHED'
      GROUP BY v.manufacturer, v.model
      ORDER BY v.manufacturer, v.model`;

    const makes = new Map<string, { manufacturer: string; slug: string; products: number; models: { model: string; slug: string; products: number }[] }>();
    for (const row of rows) {
      const make = makes.get(row.manufacturer) ?? { manufacturer: row.manufacturer, slug: slugify(row.manufacturer), products: 0, models: [] };
      make.models.push({ model: row.model, slug: slugify(row.model), products: row.products });
      make.products += row.products;
      makes.set(row.manufacturer, make);
    }
    return [...makes.values()];
  }

  // --- Admin management ---

  findAllAdmin() {
    return this.prisma.vehicle.findMany({
      include: { _count: { select: { compatibilities: true } } },
      orderBy: [{ manufacturer: "asc" }, { model: "asc" }],
    });
  }

  create(dto: CreateVehicleDto) {
    return this.prisma.vehicle.create({ data: dto });
  }

  async remove(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException("Vehicle not found");
    return this.prisma.vehicle.delete({ where: { id } });
  }
}