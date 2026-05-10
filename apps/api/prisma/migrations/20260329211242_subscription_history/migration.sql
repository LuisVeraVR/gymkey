-- DropIndex
DROP INDEX "Subscription_userId_key";

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "isCurrent" BOOLEAN NOT NULL DEFAULT true;
