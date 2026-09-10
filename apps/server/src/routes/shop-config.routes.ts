import { Router } from "express";
import { getShopConfig, isShopOpenNow } from "../services/shop-config.service";

const router = Router();

router.get("/public", async (_req, res) => {
  const config = await getShopConfig();
  res.json({
    name: config.name,
    deliveryFee: config.deliveryFee,
    minOrderValue: config.minOrderValue,
    taxPercent: config.taxPercent,
    openTime: config.openTime,
    closeTime: config.closeTime,
    address: config.address,
    upiId: config.upiId,
    whatsappNumber: config.whatsappNumber,
    isOpenNow: isShopOpenNow(config.openTime, config.closeTime),
  });
});

export default router;
