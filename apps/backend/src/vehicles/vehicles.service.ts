import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { ProductStatus, Prisma } from "@truckparts/prisma";

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

  // Progressive Find-My-Part search: results narrow as more of manufacturer
  // / model / vehicleId are picked, instead of showing nothing until a
  // single exact vehicle config is fully selected. vehicleId (the most
  // specific filter) takes priority alone when present — manufacturer/model
  // are still sent by the frontend at that point, but they'd only narrow a
  // set that's already down to one exact vehicle.
  async getProductsForFilter(filter: { manufacturer?: string; model?: string; vehicleId?: string }) {
    if (!filter.manufacturer && !filter.model && !filter.vehicleId) {
      throw new BadRequestException("At least one of manufacturer, model, or vehicleId is required");
    }

    const vehicleWhere: Prisma.VehicleWhereInput = filter.vehicleId
      ? { id: filter.vehicleId }
      : {
          ...(filter.manufacturer ? { manufacturer: filter.manufacturer } : {}),
          ...(filter.model ? { model: filter.model } : {}),
        };

    return this.prisma.product.findMany({
      where: {
        status: ProductStatus.PUBLISHED,
        quantity: { gt: 0 },
        compatibility: { some: { vehicle: vehicleWhere } },
      },
      include: { category: true, brand: true, images: { orderBy: { position: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getProductsForVehicle(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException("Vehicle not found");

    return this.prisma.product.findMany({
      where: {
        status: ProductStatus.PUBLISHED,
        quantity: { gt: 0 },
        compatibility: { some: { vehicleId } },
      },
      include: { category: true, brand: true, images: { orderBy: { position: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
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