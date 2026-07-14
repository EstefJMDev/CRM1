/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  const email = String(process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.SUPER_ADMIN_PASSWORD || '');
  const name = String(process.env.SUPER_ADMIN_NAME || 'Super').trim() || 'Super';
  const lastName = String(process.env.SUPER_ADMIN_LAST_NAME || 'Admin').trim() || 'Admin';

  if (!email || !password) {
    throw new Error(
      'Define SUPER_ADMIN_EMAIL y SUPER_ADMIN_PASSWORD antes de ejecutar este script.'
    );
  }

  const hash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        password: hash,
        role: 'SUPER_ADMIN',
        name: existing.name || name,
        lastName: existing.lastName || lastName,
        mustChangePassword: false,
        isActive: true,
      },
    });
    console.log('UPDATED');
  } else {
    await prisma.user.create({
      data: {
        email,
        name,
        lastName,
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
