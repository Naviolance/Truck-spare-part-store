import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
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