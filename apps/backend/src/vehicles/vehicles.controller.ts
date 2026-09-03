import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { VehiclesService } from "./vehicles.service";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "@truckparts/prisma";

@Controller("vehicles")
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Get("manufacturers")
  getManufacturers() {
    return this.vehiclesService.getManufacturers();
  }

  @Get("models")
  getModels(@Query("manufacturer") manufacturer: string) {
    return this.vehiclesService.getModels(manufacturer);
  }

  @Get("configs")
  getConfigs(@Query("manufacturer") manufacturer: string, @Query("model") model: string) {
    return this.vehiclesService.getConfigs(manufacturer, model);
  }

  @Get(":id/products")
  getProductsForVehicle(@Param("id") id: string) {
    return this.vehiclesService.getProductsForVehicle(id);
  }

  // Progressive Find My Part search — see vehicles.service.ts's
  // getProductsForFilter for why this takes any subset of the three filters
  // instead of requiring a fully resolved vehicleId.
  @Get("products")
  getProductsForFilter(
    @Query("manufacturer") manufacturer?: string,
    @Query("model") model?: string,
    @Query("vehicleId") vehicleId?: string,
  ) {
    return this.vehiclesService.getProductsForFilter({ manufacturer, model, vehicleId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get("admin/all")
  findAllAdmin() {
    return this.vehiclesService.findAllAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.vehiclesService.remove(id);
  }
}