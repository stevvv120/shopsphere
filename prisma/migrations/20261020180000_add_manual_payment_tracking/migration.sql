-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH_ON_DELIVERY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- Add payment method and keep existing orders readable as manual bank transfers.
ALTER TABLE "Order" ADD COLUMN "paymentMethod" "PaymentMethod";
UPDATE "Order" SET "paymentMethod" = 'BANK_TRANSFER' WHERE "paymentMethod" IS NULL;
ALTER TABLE "Order" ALTER COLUMN "paymentMethod" SET NOT NULL;

-- Add payment status for existing and future orders.
ALTER TABLE "Order" ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
