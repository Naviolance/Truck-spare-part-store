import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { Prisma, UserRole } from "@truckparts/prisma";
import { PrismaService } from "../common/prisma/prisma.service";
import { apiError } from "../common/errors";
import { paginate, searchTerm } from "../common/utils/paginate";
import { AdminCreateUserDto, AdminUsersQueryDto } from "./dto/admin-users.dto";

const BCRYPT_ROUNDS = 12;

// Never send password hashes or session data to the admin UI.
const USER_FIELDS = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  marketingOptIn: true,
  marketingOptInAt: true,
  createdAt: true,
  _count: { select: { orders: true } },
} satisfies Prisma.UserSelect;

// The admin's "Utilisateurs" page: list, create, change role, delete.
//
// Deleting someone with order history can't remove the row (orders point to
// it, and sales/stock history must stay right), so it ANONYMISES instead:
// name, e-mail, phone and addresses are erased on the account and on its
// orders and part requests, it can no longer log in, and it disappears from
// the list. Without orders or reviews, the account is simply deleted.
@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  async list(query: AdminUsersQueryDto) {
    const search = searchTerm(query.search);
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.role && { role: query.role }),
      ...(query.optIn === "yes" && { marketingOptIn: true }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search } },
        ],
      }),
    };
    const [page, optedIn] = await Promise.all([
      paginate(
        query,
        (args) => this.prisma.user.findMany({ where, select: USER_FIELDS, orderBy: [{ createdAt: "desc" }, { id: "asc" }], ...args }),
        () => this.prisma.user.count({ where }),
      ),
      this.prisma.user.count({ where: { deletedAt: null, marketingOptIn: true } }),
    ]);
    return { ...page, optedIn };
  }

  // Customers who agreed to receive offers, as CSV (opens in Excel).
  async optInCsv(): Promise<string> {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, marketingOptIn: true },
      select: { firstName: true, lastName: true, email: true, phone: true, defaultShippingPhone: true, defaultShippingCity: true, marketingOptInAt: true },
      orderBy: { marketingOptInAt: "desc" },
    });
    const cell = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const lines = users.map((u) =>
      [u.firstName, u.lastName, u.email, u.phone ?? u.defaultShippingPhone, u.defaultShippingCity, u.marketingOptInAt?.toISOString().slice(0, 10)]
        .map(cell)
        .join(";"),
    );
    return ["Prénom / First name;Nom / Last name;E-mail;Téléphone / Phone;Ville / City;Accord le / Opted in on", ...lines].join("\r\n");
  }

  async create(dto: AdminCreateUserDto) {
    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException(apiError("EMAIL_TAKEN", "An account with this email already exists"));
    }
    return this.prisma.user.create({
      data: {
        email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role ?? UserRole.CUSTOMER,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      },
      select: USER_FIELDS,
    });
  }

  async setRole(actorId: string, id: string, role: UserRole) {
    const user = await this.findActive(id);
    this.refuseSelf(actorId, id);
    if (user.role === role) return this.prisma.user.findUniqueOrThrow({ where: { id }, select: USER_FIELDS });
    if (user.role === UserRole.ADMIN) await this.refuseLastAdmin();
    // New role takes effect at once: their sessions end, they log in again.
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { role }, select: USER_FIELDS }),
      this.prisma.session.deleteMany({ where: { userId: id } }),
    ]);
    return updated;
  }

  async remove(actorId: string, id: string): Promise<{ anonymized: boolean }> {
    const user = await this.findActive(id);
    this.refuseSelf(actorId, id);
    if (user.role === UserRole.ADMIN) await this.refuseLastAdmin();

    const [orders, reviews] = await Promise.all([
      this.prisma.order.count({ where: { userId: id } }),
      this.prisma.review.count({ where: { userId: id } }),
    ]);
    const scrubRequests = this.prisma.productRequest.updateMany({
      where: { userId: id },
      data: { userId: null, contactName: null, contactPhone: null, contactEmail: null },
    });

    if (orders === 0 && reviews === 0) {
      await this.prisma.$transaction([scrubRequests, this.prisma.user.delete({ where: { id } })]);
      return { anonymized: false };
    }

    await this.prisma.$transaction([
      scrubRequests,
      this.prisma.order.updateMany({ where: { userId: id }, data: { shippingAddress: "", shippingPhone: "" } }),
      this.prisma.session.deleteMany({ where: { userId: id } }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId: id } }),
      this.prisma.cart.deleteMany({ where: { userId: id } }),
      this.prisma.user.update({
        where: { id },
        data: {
          // Unique and unusable: nobody can log in as, or re-register over, it.
          email: `deleted-${id}@deleted.invalid`,
          passwordHash: randomBytes(32).toString("hex"),
          firstName: "Client",
          lastName: "supprimé",
          phone: null,
          defaultShippingAddress: null,
          defaultShippingCity: null,
          defaultShippingPhone: null,
          role: UserRole.CUSTOMER,
          marketingOptIn: false,
          marketingOptInAt: null,
          deletedAt: new Date(),
        },
      }),
    ]);
    return { anonymized: true };
  }

  private async findActive(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, select: { id: true, role: true } });
    if (!user) throw new NotFoundException(apiError("USER_NOT_FOUND", "User not found"));
    return user;
  }

  // An admin can't demote or delete themselves (and lock themselves out).
  private refuseSelf(actorId: string, id: string) {
    if (actorId === id) throw new BadRequestException(apiError("CANNOT_CHANGE_OWN_ACCOUNT", "You can't change or delete your own account here"));
  }

  // The store must always keep at least one admin.
  private async refuseLastAdmin() {
    const admins = await this.prisma.user.count({ where: { role: UserRole.ADMIN, deletedAt: null } });
    if (admins <= 1) throw new BadRequestException(apiError("LAST_ADMIN", "The store needs at least one admin"));
  }
}
