import { Router } from "express";
import { getRepoContents, getUserRepositories } from "../controllers/githubController.js"; // Adjust path as needed
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// GET /api/github/repos
router.get("/repos", protect, getUserRepositories);

router.get("/contents",  protect, getRepoContents);

export default router;