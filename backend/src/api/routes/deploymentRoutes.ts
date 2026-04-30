import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getDeploymentStatus, getDeploymentLogs, getAllUserDeployments } from "../controllers/deploymentController.js";

const router = Router();


router.get("/:id", protect, getDeploymentStatus);
router.get("/:id/logs", protect, getDeploymentLogs);
router.get("/", protect, getAllUserDeployments);
export default router;