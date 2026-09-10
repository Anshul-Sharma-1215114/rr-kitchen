import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { uploadImage } from "../middleware/upload";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  listMenuItemsAdmin,
  createMenuItem,
  updateMenuItem,
  setMenuItemAvailability,
  deleteMenuItem,
  listCombosAdmin,
  createCombo,
  updateCombo,
  deleteCombo,
} from "../controllers/admin/menu.controller";
import { listAllOrders, assignDeliveryAgent } from "../controllers/admin/order.controller";
import { listAgents, createAgent, setAgentActive } from "../controllers/admin/agent.controller";
import { getShopConfigAdmin, updateShopConfig } from "../controllers/admin/shop-config.controller";
import { listCouponsAdmin, createCoupon, updateCoupon, deleteCoupon } from "../controllers/admin/coupon.controller";
import { listCustomers, getCustomer, setCustomerBlocked } from "../controllers/admin/customer.controller";
import { getAnalytics } from "../controllers/admin/analytics.controller";

const router = Router();
router.use(requireAuth("ADMIN"));

router.post("/categories", createCategory);
router.patch("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

router.get("/menu-items", listMenuItemsAdmin);
router.post("/menu-items", uploadImage.single("image"), createMenuItem);
router.patch("/menu-items/:id", uploadImage.single("image"), updateMenuItem);
router.patch("/menu-items/:id/availability", setMenuItemAvailability);
router.delete("/menu-items/:id", deleteMenuItem);

router.get("/combos", listCombosAdmin);
router.post("/combos", uploadImage.single("image"), createCombo);
router.patch("/combos/:id", uploadImage.single("image"), updateCombo);
router.delete("/combos/:id", deleteCombo);

router.get("/orders", listAllOrders);
router.patch("/orders/:id/assign-agent", assignDeliveryAgent);

router.get("/agents", listAgents);
router.post("/agents", createAgent);
router.patch("/agents/:id/active", setAgentActive);

router.get("/shop-config", getShopConfigAdmin);
router.patch("/shop-config", updateShopConfig);

router.get("/coupons", listCouponsAdmin);
router.post("/coupons", createCoupon);
router.patch("/coupons/:id", updateCoupon);
router.delete("/coupons/:id", deleteCoupon);

router.get("/customers", listCustomers);
router.get("/customers/:id", getCustomer);
router.patch("/customers/:id/block", setCustomerBlocked);

router.get("/analytics", getAnalytics);

export default router;
