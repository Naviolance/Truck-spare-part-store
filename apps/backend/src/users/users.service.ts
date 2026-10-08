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
    marketingOptIn?: boolean;
  }) {
    const { marketingOptIn = false, ...rest } = data;
    return this.prisma.user.create({
      data: {
        ...rest,
        email: data.email.toLowerCase(),
        role: data.role ?? UserRole.CUSTOMER,
        marketingOptIn,
        marketingOptInAt: marketingOptIn ? new Date() : null,
      },
    });
  }
    updateProfile(id: string, data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    defaultShippingAddress?: string;
    defaultShippingCity?: string;
    defaultShippingPhone?: string;
    marketingOptIn?: boolean;
  }) {
    const { marketingOptIn, ...rest } = data;
    return this.prisma.user.update({
      where: { id },
      data: {
        ...rest,
        // Record when consent was given; withdrawing it clears the date.
        ...(marketingOptIn !== undefined && { marketingOptIn, marketingOptInAt: marketingOptIn ? new Date() : null }),
      },
    });
  }
}