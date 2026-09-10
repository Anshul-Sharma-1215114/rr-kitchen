import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { listAddresses, createAddress, updateAddress, deleteAddress } from "../controllers/address.controller";

const router = Router();

router.get("/", requireAuth("CUSTOMER"), listAddresses);
router.post("/", requireAuth("CUSTOMER"), createAddress);
router.patch("/:id", requireAuth("CUSTOMER"), updateAddress);
router.delete("/:id", requireAuth("CUSTOMER"), deleteAddress);

export default router;
