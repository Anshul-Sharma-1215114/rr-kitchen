import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createOrder,
  listMyOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  markOrderPaid,
  submitReview,
} from "../controllers/order.controller";

const router = Router();

router.post("/", requireAuth("CUSTOMER"), createOrder);
router.get("/", requireAuth("CUSTOMER"), listMyOrders);
router.get("/:id", requireAuth(), getOrder);
router.patch("/:id/status", requireAuth("ADMIN", "DELIVERY_AGENT"), updateOrderStatus);
router.patch("/:id/cancel", requireAuth("CUSTOMER"), cancelOrder);
router.patch("/:id/mark-paid", requireAuth("ADMIN", "DELIVERY_AGENT"), markOrderPaid);
router.post("/:id/review", requireAuth("CUSTOMER"), submitReview);

export default router;
