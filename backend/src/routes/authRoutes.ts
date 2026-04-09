import { Router } from "express";
import { githubCallback, githubLogin } from "../controllers/authController.js";

const router = Router();

// Route: GET /api/auth/github
router.get("/github", githubLogin);

// Route: GET /api/auth/github/callback
router.get("/github/callback", githubCallback);

export default router;