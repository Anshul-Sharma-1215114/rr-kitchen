import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { listFavorites, addFavorite, removeFavorite } from "../controllers/favorite.controller";

const router = Router();

router.get("/", requireAuth("CUSTOMER"), listFavorites);
router.post("/:menuItemId", requireAuth("CUSTOMER"), addFavorite);
router.delete("/:menuItemId", requireAuth("CUSTOMER"), removeFavorite);

export default router;
