import {
  PlatformPlan,
  PlatformSubscriptionStatus,
  PrismaClient,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const hashPassword = async (pass: string) => await bcrypt.hash(pass, 10);

async function main() {
  console.log('Seeding...');

  const primaryTenant = await prisma.tenant.upsert({
    where: { slug: 'demo-gym' },
    update: {
      config: {
        gracePeriodDays: 5,
        branding: {
          primaryColor: '#10b981',
          accentColor: '#34d399',
          appName: 'GymKey Demo Gym',
        },
      },
    },
    create: {
      name: 'Demo Gym',
      slug: 'demo-gym',
      config: {
        gracePeriodDays: 5,
        branding: {
          primaryColor: '#10b981',
          accentColor: '#34d399',
          appName: 'GymKey Demo Gym',
        },
      },
    },
  });

  const sandboxTenant = await prisma.tenant.upsert({
    where: { slug: 'demo-sandbox' },
    update: {
      config: {
        gracePeriodDays: 5,
        demoMode: true,
        branding: {
          primaryColor: '#6366f1',
          accentColor: '#818cf8',
          appName: 'GymKey Sandbox',
        },
      },
    },
    create: {
      name: 'Demo Sandbox',
      slug: 'demo-sandbox',
      config: {
        gracePeriodDays: 5,
        demoMode: true,
        branding: {
          primaryColor: '#6366f1',
          accentColor: '#818cf8',
          appName: 'GymKey Sandbox',
        },
      },
    },
  });

  const businessAccount = await prisma.platformBillingAccount.upsert({
    where: { id: 'billing-account-demo-main' },
    update: {
      name: 'Demo Gym Billing',
      email: 'owner@demogym.com',
      plan: PlatformPlan.PRO,
      status: PlatformSubscriptionStatus.ACTIVE,
      hasUsedTrial: true,
      tenantLimit: 1,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(new Date().setDate(new Date().getDate() + 30)),
    },
    create: {
      id: 'billing-account-demo-main',
      name: 'Demo Gym Billing',
      email: 'owner@demogym.com',
      plan: PlatformPlan.PRO,
      status: PlatformSubscriptionStatus.ACTIVE,
      hasUsedTrial: true,
      tenantLimit: 1,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(new Date().setDate(new Date().getDate() + 30)),
    },
  });

  const sandboxAccount = await prisma.platformBillingAccount.upsert({
    where: { id: 'billing-account-demo-sandbox' },
    update: {
      name: 'Sandbox Billing',
      email: 'sandbox@gymkey.com',
      plan: PlatformPlan.DEMO,
      status: PlatformSubscriptionStatus.ACTIVE,
      hasUsedTrial: false,
      tenantLimit: 1,
    },
    create: {
      id: 'billing-account-demo-sandbox',
      name: 'Sandbox Billing',
      email: 'sandbox@gymkey.com',
      plan: PlatformPlan.DEMO,
      status: PlatformSubscriptionStatus.ACTIVE,
      hasUsedTrial: false,
      tenantLimit: 1,
    },
  });

  await prisma.tenant.update({
    where: { id: primaryTenant.id },
    data: { billingAccountId: businessAccount.id },
  });

  await prisma.tenant.update({
    where: { id: sandboxTenant.id },
    data: { billingAccountId: sandboxAccount.id },
  });

  await prisma.platformSubscription.upsert({
    where: { billingAccountId: businessAccount.id },
    update: {
      plan: PlatformPlan.PRO,
      status: PlatformSubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(new Date().setDate(new Date().getDate() + 30)),
    },
    create: {
      billingAccountId: businessAccount.id,
      plan: PlatformPlan.PRO,
      status: PlatformSubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(new Date().setDate(new Date().getDate() + 30)),
    },
  });

  await prisma.platformSubscription.upsert({
    where: { billingAccountId: sandboxAccount.id },
    update: {
      plan: PlatformPlan.DEMO,
      status: PlatformSubscriptionStatus.ACTIVE,
    },
    create: {
      billingAccountId: sandboxAccount.id,
      plan: PlatformPlan.DEMO,
      status: PlatformSubscriptionStatus.ACTIVE,
    },
  });

  const password = await hashPassword('123456');

  const users = [
    {
      email: 'super@gymkey.com',
      password,
      role: UserRole.SUPER_ADMIN,
      name: 'Super Admin',
      tenantId: primaryTenant.id,
    },
    {
      email: 'admin@demogym.com',
      password,
      role: UserRole.GYM_ADMIN,
      name: 'Gym Admin',
      tenantId: primaryTenant.id,
    },
    {
      email: 'staff@demogym.com',
      password,
      role: UserRole.STAFF,
      name: 'Staff Member',
      tenantId: primaryTenant.id,
    },
    {
      email: 'coach@demogym.com',
      password,
      role: UserRole.COACH,
      name: 'Coach Carter',
      tenantId: primaryTenant.id,
    },
    {
      email: 'member@demogym.com',
      password,
      role: UserRole.MEMBER,
      name: 'John Member',
      tenantId: primaryTenant.id,
    },
    {
      email: 'sandbox-admin@gymkey.com',
      password,
      role: UserRole.GYM_ADMIN,
      name: 'Sandbox Admin',
      tenantId: sandboxTenant.id,
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

    if (u.role === UserRole.MEMBER && user.tenantId) {
      const plan = await prisma.plan.findFirst({
        where: { tenantId: user.tenantId, name: 'Gold Plan' },
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
          },
        });
        planId = newPlan.id;
      }

      const existingSub = await prisma.subscription.findFirst({
        where: { userId: user.id, isCurrent: true },
      });

      if (!existingSub) {
        await prisma.subscription.create({
          data: {
            userId: user.id,
            planId: planId!,
            status: SubscriptionStatus.ACTIVE,
            endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
          },
        });
      }
    }
  }

  const sandboxPlans = [
    {
      name: 'Sandbox Starter',
      price: 120000,
      duration: 30,
      description: 'Plan de ejemplo para sandbox',
      tenantId: sandboxTenant.id,
      features: ['Miembros', 'Pagos manuales'],
    },
    {
      name: 'Sandbox Pro',
      price: 240000,
      duration: 30,
      description: 'Plan premium de ejemplo',
      tenantId: sandboxTenant.id,
      features: ['Miembros', 'Pagos manuales', 'Portal público'],
    },
  ];

  for (const plan of sandboxPlans) {
    const existing = await prisma.plan.findFirst({
      where: { tenantId: plan.tenantId, name: plan.name },
    });
    if (!existing) {
      await prisma.plan.create({ data: plan });
    }
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
