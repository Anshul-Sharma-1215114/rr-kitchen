import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { listMyDeliveries } from "../controllers/delivery.controller";

const router = Router();

router.get("/orders", requireAuth("DELIVERY_AGENT"), listMyDeliveries);

export default router;
