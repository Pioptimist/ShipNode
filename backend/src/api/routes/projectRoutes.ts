import { Router } from "express";
import { createProject } from "../controllers/githubController.js"; 
import { protect } from "../middleware/authMiddleware.js";
import { deleteProject, getProjectById, getUserProjects, rollbackProject } from "../controllers/projectController.js";
import { addProjectEnv, deleteProjectEnv, getProjectEnvs } from "../controllers/envController.js";

const router = Router();

// POST /api/projects

router.post("/", protect, createProject);

router.get("/", protect, getUserProjects);

router.delete("/:id", protect, deleteProject);

// GET /api/projects/:id
router.get("/:id", protect, getProjectById);
router.post("/:projectId/rollback", protect, rollbackProject);

// GET /api/projects/:projectId/envs
router.get("/:projectId/envs", protect, getProjectEnvs);

// POST /api/projects/:projectId/envs
router.post("/:projectId/envs", protect, addProjectEnv);

// DELETE /api/projects/:projectId/envs/:envId
router.delete("/:projectId/envs/:envId", protect, deleteProjectEnv);
export default router;