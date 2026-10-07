import { randomUUID } from "crypto";
import { UserRole } from "@truckparts/prisma";
import { PrismaService } from "../common/prisma/prisma.service";
import { AdminUsersService } from "./admin-users.service";

// Real Postgres (pnpm test:db).
const describeDb = process.env.DB_TESTS ? describe : describe.skip;

describeDb("admin users (real database)", () => {
  const prisma = new PrismaService();
  const users = new AdminUsersService(prisma);
  const tag = randomUUID().slice(0, 8);
  const actorId = randomUUID();

  const make = (name: string, role: UserRole = UserRole.CUSTOMER) =>
    prisma.user.create({
      data: { email: `${name}-${tag}@example.com`, firstName: name, lastName: "Test", phone: "+237 600 00 00 00", passwordHash: "x", role },
    });

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.user.create({ data: { id: actorId, email: `actor-${tag}@example.com`, firstName: "Actor", lastName: "Admin", passwordHash: "x", role: UserRole.ADMIN } });
  });
  afterAll(async () => {
    await prisma.order.deleteMany({ where: { orderNumber: { startsWith: `T-${tag}` } } });
    await prisma.user.deleteMany({ where: { OR: [{ email: { contains: tag } }, { id: actorId }] } });
    await prisma.$disconnect();
  });

  it("deletes an account with no orders outright", async () => {
    const u = await make("plain");
    await prisma.session.create({ data: { userId: u.id, tokenHash: `h-${tag}`, lastActiveAt: new Date(), expiresAt: new Date(Date.now() + 1e7) } });
    expect(await users.remove(actorId, u.id)).toEqual({ anonymized: false });
    expect(await prisma.user.findUnique({ where: { id: u.id } })).toBeNull();
  });

  it("anonymises an account with orders: personal data gone, orders kept", async () => {
    const u = await make("buyer");
    const order = await prisma.order.create({
      data: { orderNumber: `T-${tag}-1`, userId: u.id, subtotal: 1000, total: 1000, shippingAddress: "Rue 1", shippingCity: "Douala", shippingPhone: "+237 677" },
    });
    expect(await users.remove(actorId, u.id)).toEqual({ anonymized: true });

    const after = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(after).toMatchObject({ firstName: "Client", lastName: "supprimé", phone: null, marketingOptIn: false });
    expect(after.email).toBe(`deleted-${u.id}@deleted.invalid`);
    expect(after.deletedAt).not.toBeNull();
    expect(await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({ shippingPhone: "", shippingAddress: "", shippingCity: "Douala" });
    // Gone from the admin list.
    expect((await users.list({ search: "buyer" })).items.find((x) => x.id === u.id)).toBeUndefined();
  });

  it("refuses to change or delete your own account", async () => {
    await expect(users.remove(actorId, actorId)).rejects.toThrow();
    await expect(users.setRole(actorId, actorId, UserRole.CUSTOMER)).rejects.toThrow();
  });

  it("promotes and demotes, ending the person's sessions", async () => {
    const u = await make("staff");
    await prisma.session.create({ data: { userId: u.id, tokenHash: `s-${tag}`, lastActiveAt: new Date(), expiresAt: new Date(Date.now() + 1e7) } });
    expect((await users.setRole(actorId, u.id, UserRole.ADMIN)).role).toBe(UserRole.ADMIN);
    expect(await prisma.session.count({ where: { userId: u.id } })).toBe(0);
    expect((await users.setRole(actorId, u.id, UserRole.CUSTOMER)).role).toBe(UserRole.CUSTOMER);
  });

  it("lists who agreed to offers and exports them", async () => {
    const u = await prisma.user.create({
      data: { email: `optin-${tag}@example.com`, firstName: "Opt", lastName: "In", passwordHash: "x", marketingOptIn: true, marketingOptInAt: new Date() },
    });
    const list = await users.list({ optIn: "yes", search: `optin-${tag}` });
    expect(list.items.map((x) => x.id)).toEqual([u.id]);
    expect(await users.optInCsv()).toContain(`optin-${tag}@example.com`);
  });
});
