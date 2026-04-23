import { Router } from "express";
import { createProject } from "../controllers/githubController.js"; 
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// POST /api/projects
// Requires Auth: Yes. We need req.user to tie the project to their account.
router.post("/", protect, createProject);

export default router;