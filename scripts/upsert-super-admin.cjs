const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  const email = 'salva@sevital.es';
  const password = 'WMrlYe';
  const hash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        password: hash,
        role: 'SUPER_ADMIN',
        name: existing.name || 'Super',
        lastName: existing.lastName || 'Admin',
        mustChangePassword: false,
        isActive: true,
      },
    });
    console.log('UPDATED');
  } else {
    await prisma.user.create({
      data: {
        email,
        name: 'Super',
        lastName: 'Admin',
        password: hash,
        role: 'SUPER_ADMIN',
        mustChangePassword: false,
        isActive: true,
      },
    });
    console.log('CREATED');
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true },
  });

  console.log(JSON.stringify(user));
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
