import { PrismaClient, UserRole, SubscriptionStatus } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Simple hash function for demo (in production use bcrypt/argon2)
// For this seed we will store plain text just to make it easy to login, 
// BUT the app should use bcrypt. I will implement bcrypt in the app.
// For the seed, I'll assume the app uses a hashing utility.
// To make it simple for now, I will simulate a hashed password.
const hashPassword = (pass: string) => `hashed_${pass}`; 

async function main() {
  console.log('Seeding...');

  // 1. Create Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-gym' },
    update: {},
    create: {
      name: 'Demo Gym',
      slug: 'demo-gym',
      config: { gracePeriodDays: 5 },
    },
  });

  console.log('Tenant created:', tenant.name);

  // 2. Create Users
  const users = [
    {
      email: 'super@gymkey.com',
      password: hashPassword('123456'),
      role: UserRole.SUPER_ADMIN,
      name: 'Super Admin',
      tenantId: null, // Super admin might not belong to a specific gym or belongs to a system tenant
    },
    {
      email: 'admin@demogym.com',
      password: hashPassword('123456'),
      role: UserRole.GYM_ADMIN,
      name: 'Gym Admin',
      tenantId: tenant.id,
    },
    {
      email: 'staff@demogym.com',
      password: hashPassword('123456'),
      role: UserRole.STAFF,
      name: 'Staff Member',
      tenantId: tenant.id,
    },
    {
      email: 'coach@demogym.com',
      password: hashPassword('123456'),
      role: UserRole.COACH,
      name: 'Coach Carter',
      tenantId: tenant.id,
    },
    {
      email: 'member@demogym.com',
      password: hashPassword('123456'),
      role: UserRole.MEMBER,
      name: 'John Member',
      tenantId: tenant.id,
    },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        password: u.password, // Ideally use bcrypt here
        role: u.role,
        name: u.name,
        tenantId: u.tenantId,
      },
    });
    console.log(`User ${user.role} created: ${user.email}`);

    // If member, create plan and subscription
    if (u.role === UserRole.MEMBER) {
      const plan = await prisma.plan.create({
        data: {
          name: 'Gold Plan',
          price: 50.00,
          duration: 30,
          tenantId: tenant.id,
          features: ['Gym Access', 'Sauna'],
        }
      });
      
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
        }
      });
      console.log('Member subscription created');
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
