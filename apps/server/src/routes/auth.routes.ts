import { Router } from "express";
import { requestCustomerOtp, verifyCustomerOtp, staffLogin, logout, me } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/customer/otp/request", requestCustomerOtp);
router.post("/customer/otp/verify", verifyCustomerOtp);
router.post("/staff/login", staffLogin);
router.post("/logout", logout);
router.get("/me", requireAuth(), me);

export default router;
