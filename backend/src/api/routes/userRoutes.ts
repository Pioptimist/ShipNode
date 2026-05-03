import express from "express";
import { checkUsername, updateProfile } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js"; // Adjust path to your auth middleware

const router = express.Router();

// GET /api/users/check-username?username=xyz

router.get("/check-username", checkUsername);

// PATCH /api/users/profile

router.patch("/profile", protect, updateProfile);

export default router;