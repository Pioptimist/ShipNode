import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getDeploymentStatus, getDeploymentLogs, getAllUserDeployments, getProjectDeployments } from "../controllers/deploymentController.js";

const router = Router();


router.get("/:id", protect, getDeploymentStatus);
router.get("/:id/logs", protect, getDeploymentLogs);
router.get("/", protect, getAllUserDeployments);

router.get("/:projectId/deployments", protect, getProjectDeployments);
export default router;