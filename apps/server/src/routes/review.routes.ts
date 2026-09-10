import { Router } from "express";
import { listFeaturedReviews } from "../controllers/review.controller";

const router = Router();

router.get("/featured", listFeaturedReviews);

export default router;
