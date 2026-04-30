import { Router } from "express";
import { createProject } from "../controllers/githubController.js"; 
import { protect } from "../middleware/authMiddleware.js";
import { deleteProject, getProjectById, getUserProjects, rollbackProject } from "../controllers/projectController.js";

const router = Router();

// POST /api/projects

router.post("/", protect, createProject);

router.get("/", protect, getUserProjects);

router.delete("/:id", protect, deleteProject);

// GET /api/projects/:id
router.get("/:id", protect, getProjectById);
router.post("/:projectId/rollback", protect, rollbackProject);

export default router;