import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateCoupon } from "../controllers/coupon.controller";

const router = Router();

router.post("/validate", requireAuth("CUSTOMER"), validateCoupon);

export default router;
