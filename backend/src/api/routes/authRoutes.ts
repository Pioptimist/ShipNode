import { Router } from "express";
import { getMe, githubCallback, githubLogin, refreshAccessToken, logout } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// Route: GET /api/auth/github
router.get("/github", githubLogin);

// Route: GET /api/auth/github/callback
router.get("/github/callback", githubCallback);

router.post("/refresh", refreshAccessToken);

router.post("/logout", logout);

router.get("/me", protect, getMe);
export default router;