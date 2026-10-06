// Make an existing account an admin.
//
//   pnpm admin:promote someone@example.com
//
// The account must already exist: register it normally on the site first,
// so its password is chosen by its owner and never typed into a terminal.
import { PrismaClient } from "../generated/client";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: pnpm admin:promote <email>");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`No account with email ${email}. Register it on the site first, then run this again.`);
      process.exit(1);
    }
    if (user.role === "ADMIN") {
      console.log(`${email} is already an admin.`);
      return;
    }
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    console.log(`${email} is now an admin. They need to log out and back in for it to take effect.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
