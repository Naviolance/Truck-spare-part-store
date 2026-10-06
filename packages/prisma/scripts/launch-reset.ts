// Clears test/demo data before launch, keeping ONE admin account.
//
//   pnpm launch:reset --keep owner@example.com                  # dry run: shows what would be deleted
//   pnpm launch:reset --keep owner@example.com --yes            # actually deletes
//   pnpm launch:reset --keep owner@example.com --wipe-catalog --yes
//                       # also deletes products, categories, brands, trucks, coupons
//
// Deletes: orders, payments, carts, reviews, part requests, sessions,
// password-reset tokens, and every user except --keep. Runs in ONE
// transaction: it either fully succeeds or changes nothing.
//
// Images in object storage are not touched (they're only orphaned files;
// clean the bucket separately if needed). Take a database backup first.
import { PrismaClient } from "../generated/client";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const keepEmail = arg("--keep")?.trim().toLowerCase();
  const execute = process.argv.includes("--yes");
  const wipeCatalog = process.argv.includes("--wipe-catalog");
  if (!keepEmail) {
    console.error("Usage: pnpm launch:reset --keep <admin-email> [--wipe-catalog] [--yes]");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const keep = await prisma.user.findUnique({ where: { email: keepEmail } });
    if (!keep) throw new Error(`No account with email ${keepEmail}. Register and promote it first.`);
    if (keep.role !== "ADMIN") throw new Error(`${keepEmail} is not an admin. Run: pnpm admin:promote ${keepEmail}`);

    const counts = {
      orders: await prisma.order.count(),
      payments: await prisma.payment.count(),
      cartItems: await prisma.cartItem.count(),
      reviews: await prisma.review.count(),
      productRequests: await prisma.productRequest.count(),
      sessions: await prisma.session.count({ where: { userId: { not: keep.id } } }),
      users: await prisma.user.count({ where: { id: { not: keep.id } } }),
      ...(wipeCatalog && {
        products: await prisma.product.count(),
        categories: await prisma.category.count(),
        brands: await prisma.brand.count(),
        vehicles: await prisma.vehicle.count(),
        coupons: await prisma.coupon.count(),
      }),
    };

    const dbHost = (process.env.DATABASE_URL ?? "").replace(/\/\/[^@]*@/, "//***@").split("?")[0];
    console.log(`Database: ${dbHost}`);
    console.log(`Keeping admin: ${keepEmail}`);
    console.table(counts);

    if (!execute) {
      console.log("Dry run — nothing was deleted. Re-run with --yes to delete the rows above.");
      return;
    }

    // Children before parents (foreign keys).
    await prisma.$transaction([
      prisma.payment.deleteMany(),
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.cartItem.deleteMany(),
      prisma.cart.deleteMany({ where: { userId: { not: keep.id } } }),
      prisma.review.deleteMany(),
      prisma.productRequest.deleteMany(),
      prisma.passwordResetToken.deleteMany(),
      prisma.session.deleteMany({ where: { userId: { not: keep.id } } }),
      prisma.user.deleteMany({ where: { id: { not: keep.id } } }),
      ...(wipeCatalog
        ? [
            prisma.productCompatibility.deleteMany(),
            prisma.productImage.deleteMany(),
            prisma.product.deleteMany(),
            prisma.category.deleteMany(),
            prisma.brand.deleteMany(),
            prisma.vehicle.deleteMany(),
            prisma.coupon.deleteMany(),
          ]
        : []),
    ]);
    console.log("Done. Only the kept admin account remains.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
