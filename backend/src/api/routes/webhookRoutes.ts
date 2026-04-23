import { Router } from "express";
import { handleGithubWebhook } from "../controllers/githubController.js";

const router = Router();

// POST /api/webhooks/github

router.post("/github", handleGithubWebhook);

export default router;