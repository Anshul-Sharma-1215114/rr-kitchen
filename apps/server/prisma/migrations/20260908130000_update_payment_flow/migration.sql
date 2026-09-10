-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('COD', 'UPI_MANUAL');
ALTER TABLE "Order" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_new" USING ("paymentMethod"::text::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "PaymentMethod_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('UNPAID', 'PAID');
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" TYPE "PaymentStatus_new" USING ("paymentStatus"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" SET DEFAULT 'UNPAID';
COMMIT;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "razorpayOrderId",
DROP COLUMN "razorpayPaymentId",
ALTER COLUMN "paymentStatus" SET DEFAULT 'UNPAID';

-- AlterTable
ALTER TABLE "ShopConfig" ADD COLUMN     "upiId" TEXT;

