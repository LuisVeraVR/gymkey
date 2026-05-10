-- CreateEnum
CREATE TYPE "PlatformPlan" AS ENUM ('DEMO', 'STARTER', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "PlatformSubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "billingAccountId" TEXT;

-- CreateTable
CREATE TABLE "PlatformBillingAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "plan" "PlatformPlan" NOT NULL DEFAULT 'DEMO',
    "status" "PlatformSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "hasUsedTrial" BOOLEAN NOT NULL DEFAULT false,
    "tenantLimit" INTEGER NOT NULL DEFAULT 1,
    "trialStartDate" TIMESTAMP(3),
    "trialEndDate" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "externalCustomerId" TEXT,
    "externalSubscriptionId" TEXT,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformBillingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSubscription" (
    "id" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "plan" "PlatformPlan" NOT NULL DEFAULT 'DEMO',
    "status" "PlatformSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "trialStartDate" TIMESTAMP(3),
    "trialEndDate" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "externalCustomerId" TEXT,
    "externalSubscriptionId" TEXT,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSubscription_billingAccountId_key" ON "PlatformSubscription"("billingAccountId");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "PlatformBillingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformSubscription" ADD CONSTRAINT "PlatformSubscription_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "PlatformBillingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
