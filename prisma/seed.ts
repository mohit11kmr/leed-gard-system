import { PrismaClient, Role } from "@prisma/client";
import { generateApiKey, hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@leadguard.app").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin-password-change-me";
  const name = process.env.ADMIN_NAME || "Admin";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      password: await hashPassword(password),
      name,
      role: Role.ADMIN,
      apiKey: generateApiKey(),
    },
  });
  console.log(`Created admin user: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });