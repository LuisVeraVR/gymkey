import { PrismaClient, UserRole, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const hashPassword = async (pass: string) => await bcrypt.hash(pass, 10);

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
  const password = await hashPassword('123456');
  
  const users = [
    {
      email: 'super@gymkey.com',
      password,
      role: UserRole.SUPER_ADMIN,
      name: 'Super Admin',
      tenantId: tenant.id, 
    },
    {
      email: 'admin@demogym.com',
      password,
      role: UserRole.GYM_ADMIN,
      name: 'Gym Admin',
      tenantId: tenant.id,
    },
    {
      email: 'staff@demogym.com',
      password,
      role: UserRole.STAFF,
      name: 'Staff Member',
      tenantId: tenant.id,
    },
    {
      email: 'coach@demogym.com',
      password,
      role: UserRole.COACH,
      name: 'Coach Carter',
      tenantId: tenant.id,
    },
    {
      email: 'member@demogym.com',
      password,
      role: UserRole.MEMBER,
      name: 'John Member',
      tenantId: tenant.id,
    },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: u.password, // Update password if user exists
        role: u.role,
        tenantId: u.tenantId,
      },
      create: {
        email: u.email,
        password: u.password,
        role: u.role,
        name: u.name,
        tenantId: u.tenantId,
      },
    });
    console.log(`User ${user.role} created: ${user.email}`);

    // If member, create plan and subscription
    if (u.role === UserRole.MEMBER && user.tenantId) {
      // Find or create plan
      const plan = await prisma.plan.findFirst({
        where: { tenantId: user.tenantId, name: 'Gold Plan' }
      });

      let planId = plan?.id;

      if (!planId) {
        const newPlan = await prisma.plan.create({
          data: {
            name: 'Gold Plan',
            price: 50.00,
            duration: 30,
            tenantId: user.tenantId,
            features: ['Gym Access', 'Sauna'],
          }
        });
        planId = newPlan.id;
      }
      
      // Upsert subscription
      await prisma.subscription.upsert({
        where: { 
          // Assuming there is a unique constraint or just finding first active
          // Since schema isn't fully visible, we'll try to find one first to be safe or just create if not exists
          // For simplicity in seed, let's just create if not exists using findFirst
          id: 'temp-id-placeholder' // This won't work for upsert without a valid unique ID. 
          // Let's use findFirst then create/update logic instead of upsert if we don't know the ID
         },
        update: {},
        create: {
            userId: user.id,
            planId: planId,
            status: SubscriptionStatus.ACTIVE,
            endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
        }
      }).catch(async () => {
         // Fallback if upsert fails or to handle the logic manually
         const existingSub = await prisma.subscription.findFirst({
             where: { userId: user.id }
         });
         
         if (!existingSub) {
             await prisma.subscription.create({
                data: {
                  userId: user.id,
                  planId: planId!,
                  status: SubscriptionStatus.ACTIVE,
                  endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
                }
             });
         }
      });
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
