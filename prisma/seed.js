// ==========================================
// © bighosting by bigmanjtech™
// Seed Script – Creates Admin + Plans
// Run: npm run seed:admin
// ==========================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const plans = [
  { name: 'Starter', ram: 512, disk: 1024, cpu: 100, monthly: 1500, yearly: 15000, size: 1 },
  { name: 'Pro', ram: 1024, disk: 3072, cpu: 100, monthly: 3500, yearly: 35000, size: 3 },
  { name: 'Business', ram: 2048, disk: 6144, cpu: 200, monthly: 6500, yearly: 65000, size: 6 },
  { name: 'Performance', ram: 3072, disk: 10240, cpu: 200, monthly: 10000, yearly: 100000, size: 10 },
  { name: 'Advanced', ram: 4096, disk: 15360, cpu: 300, monthly: 15000, yearly: 150000, size: 15 },
  { name: 'Enterprise', ram: 5120, disk: 25600, cpu: 300, monthly: 22000, yearly: 200000, size: 25 },
  { name: 'Extreme', ram: 6144, disk: 40960, cpu: 400, monthly: 28000, yearly: 200000, size: 40 },
  { name: 'Ultra', ram: 7168, disk: 61440, cpu: 400, monthly: 32000, yearly: 200000, size: 60 },
  { name: 'Mega', ram: 8192, disk: 81920, cpu: 500, monthly: 36000, yearly: 200000, size: 80 },
  { name: 'Titan', ram: 9216, disk: 102400, cpu: 500, monthly: 40000, yearly: 200000, size: 100 },
  { name: '♾️ Infinity', ram: 0, disk: 0, cpu: 0, monthly: 45000, yearly: 200000, size: 999999 },
];

async function seed() {
  console.log('🚀 Seeding bighosting...');

  // ---- Seed Admin ----
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@bighosting.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        isSuspended: false,
      },
    });
    console.log(`✅ Admin seeded: ${adminEmail}`);
  } else {
    console.log('✅ Admin already exists');
  }

  // ---- Seed Plans ----
  for (const p of plans) {
    const existing = await prisma.plan.findFirst({
      where: { name: p.name },
    });

    if (!existing) {
      await prisma.plan.create({
        data: {
          name: p.name,
          ramLimit: p.ram,
          diskLimit: p.disk,
          cpuLimit: p.cpu,
          priceMonthly: p.monthly,
          priceYearly: p.yearly,
          botSizeLimit: p.size,
          currency: 'TSh',
          isActive: true,
        },
      });
      console.log(`✅ Plan created: ${p.name}`);
    } else {
      console.log(`⏩ Plan exists: ${p.name}`);
    }
  }

  console.log('🎉 Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});