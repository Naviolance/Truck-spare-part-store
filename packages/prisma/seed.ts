import { PrismaClient, ProductCondition, ProductStatus, UserRole } from "./generated/client";
import { faker } from "@faker-js/faker";
import crypto from "crypto";

const prisma = new PrismaClient();

// Simple placeholder hash so we don't need bcrypt wired up just for seed data.
// The real auth module will use bcrypt/argon2 — this is ONLY for local seed convenience.
function fakeHash(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log("Seeding database...");

  // --- Admin + test customer ---
  await prisma.user.upsert({
    where: { email: "admin@truckparts.local" },
    update: {},
    create: {
      email: "admin@truckparts.local",
      passwordHash: fakeHash("admin123"),
      firstName: "Admin",
      lastName: "User",
      role: UserRole.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "customer@truckparts.local" },
    update: {},
    create: {
      email: "customer@truckparts.local",
      passwordHash: fakeHash("customer123"),
      firstName: "Test",
      lastName: "Customer",
      role: UserRole.CUSTOMER,
    },
  });

  // --- Categories ---
  const categoryNames = ["Engine Parts", "Brakes", "Suspension", "Electrical", "Filters", "Transmission"];
  const categories = [];
  for (const name of categoryNames) {
    const category = await prisma.category.upsert({
      where: { slug: faker.helpers.slugify(name).toLowerCase() },
      update: {},
      create: {
        name,
        slug: faker.helpers.slugify(name).toLowerCase(),
      },
    });
    categories.push(category);
  }

  // --- Brands ---
  const brandNames = ["Bosch", "Cummins", "Detroit Diesel", "Eaton", "Meritor", "Wabco"];
  const brands = [];
  for (const name of brandNames) {
    const brand = await prisma.brand.upsert({
      where: { slug: name.toLowerCase().replace(/\s+/g, "-") },
      update: {},
      create: {
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
      },
    });
    brands.push(brand);
  }

  // --- Vehicles ---
  const vehicleData = [
    { manufacturer: "Volvo", model: "FH16", yearStart: 2015, yearEnd: 2024, engine: "D16" },
    { manufacturer: "Mercedes-Benz", model: "Actros", yearStart: 2012, yearEnd: 2024, engine: "OM471" },
    { manufacturer: "Scania", model: "R-Series", yearStart: 2013, yearEnd: 2023, engine: "DC13" },
    { manufacturer: "MAN", model: "TGX", yearStart: 2014, yearEnd: 2024, engine: "D26" },
    { manufacturer: "DAF", model: "XF", yearStart: 2016, yearEnd: 2024, engine: "MX-13" },
  ];
  const vehicles = [];
  for (const v of vehicleData) {
    const vehicle = await prisma.vehicle.create({ data: v });
    vehicles.push(vehicle);
  }

  // --- Products ---
  for (let i = 0; i < 24; i++) {
    const category = faker.helpers.arrayElement(categories);
    const brand = faker.helpers.arrayElement(brands);
    const condition = faker.helpers.arrayElement([
      ProductCondition.NEW,
      ProductCondition.USED,
      ProductCondition.RECONDITIONED,
    ]);
    const name = `${brand.name} ${category.name.replace(/s$/, "")} ${faker.string.alphanumeric(5).toUpperCase()}`;

    const product = await prisma.product.create({
      data: {
        name,
        slug: faker.helpers.slugify(name).toLowerCase() + "-" + faker.string.alphanumeric(4).toLowerCase(),
        description: faker.commerce.productDescription(),
        price: faker.commerce.price({ min: 15, max: 800 }),
        quantity: faker.number.int({ min: 0, max: 50 }),
        condition,
        conditionNotes: condition !== ProductCondition.NEW ? "Tested, minor wear, fully functional." : null,
        status: ProductStatus.PUBLISHED,
        partNumber: faker.string.alphanumeric(10).toUpperCase(),
        categoryId: category.id,
        brandId: brand.id,
      },
    });

    // Attach 1-3 random vehicle compatibilities
    const compatCount = faker.number.int({ min: 1, max: 3 });
    const chosenVehicles = faker.helpers.arrayElements(vehicles, compatCount);
    for (const vehicle of chosenVehicles) {
      await prisma.productCompatibility.create({
        data: { productId: product.id, vehicleId: vehicle.id },
      });
    }

    // Attach a placeholder image
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: `https://placehold.co/600x400?text=${encodeURIComponent(brand.name)}`,
        position: 0,
      },
    });
  }

  console.log("Seed complete.");
  console.log("Admin login: admin@truckparts.local / admin123");
  console.log("Customer login: customer@truckparts.local / customer123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
