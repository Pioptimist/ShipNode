import { Router } from "express";
import { getRepoContents, getUserRepositories, getRepoBranches } from "../controllers/githubController.js"; // Adjust path as needed
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// GET /api/github/repos
router.get("/repos", protect, getUserRepositories);

// GET /api/github/contents?repoOwner=...&repoName=...&path=...&branch=...
router.get("/contents",  protect, getRepoContents);

// GET /api/github/branches?repoOwner=...&repoName=...
router.get("/branches", protect, getRepoBranches);

export default router;