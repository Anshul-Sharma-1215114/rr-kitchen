-- DropForeignKey
ALTER TABLE "DeliveryFeeSlab" DROP CONSTRAINT "DeliveryFeeSlab_shopConfigId_fkey";

-- AlterTable
ALTER TABLE "Address" DROP COLUMN "lat",
DROP COLUMN "lng";

-- AlterTable
ALTER TABLE "DeliveryAgentProfile" DROP COLUMN "currentLat",
DROP COLUMN "currentLng",
DROP COLUMN "locationUpdatedAt";

-- AlterTable
ALTER TABLE "ShopConfig" DROP COLUMN "deliveryRadiusKm",
DROP COLUMN "lat",
DROP COLUMN "lng",
ADD COLUMN     "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "DeliveryFeeSlab";

-- Seed a real starting delivery fee for the existing shop row (roughly the
-- old mid-tier distance slab) rather than leaving it at the column default
-- of 0, which would silently make every delivery free until an admin
-- happens to visit Settings.
UPDATE "ShopConfig" SET "deliveryFee" = 30 WHERE "id" = 'shop_config';
