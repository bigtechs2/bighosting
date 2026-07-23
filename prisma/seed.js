// ==========================================
// © bighosting by bigmanjtech™
// Seed Script – Creates the first SUPER_ADMIN
// Run: npm run seed:admin
// ==========================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function seedAdmin() {
  console.log('🚀 Seeding admin user...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@bighosting.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('✅ Admin already exists. Skipping seed.');
    process.exit(0);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(adminPassword, salt);

  // Create admin
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      isSuspended: false,
    },
  });

  console.log(`✅ Admin seeded successfully!`);
  console.log(`📧 Email: ${admin.email}`);
  console.log(`🔑 Password: ${adminPassword}`);
  console.log(`⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER LOGIN!`);

  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});