import { Router } from "express";
import { getMe, githubCallback, githubLogin } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// Route: GET /api/auth/github
router.get("/github", githubLogin);

// Route: GET /api/auth/github/callback
router.get("/github/callback", githubCallback);

router.get("/me", protect, getMe);
export default router;