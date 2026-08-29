import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { UserRole } from "@truckparts/prisma";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
  }) {
    return this.prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
        role: data.role ?? UserRole.CUSTOMER,
      },
    });
  }
}