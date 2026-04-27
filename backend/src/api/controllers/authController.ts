import { Request, Response } from "express";
import * as authService from "../services/authService.js";
import { ENV } from "../../lib/env.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import jwt from "jsonwebtoken";
import { generateAccessToken } from "../../utils/jwt.js";
import { db } from "../../db/index.js";
import { eq } from "drizzle-orm"; // added eq import
import { users } from "../../db/schema.js";

export const githubLogin = (req: Request, res: Response) => {

  const url = authService.getGithubAuthUrl();
  res.redirect(url);

};

export const githubCallback = async (req: Request, res: Response) => {
  try {
    // Grab the code from the URL
    const code = req.query.code as string;
    const result = await authService.handleGithubCallback(code);

    //  Business Logic Failure (e.g., Code was missing or invalid)
    if (!result.success || !result.data) {
      console.warn("Auth Rejected:", result.message);
      
      return res.redirect(`${ENV.FRONTEND_URL}/login?error=auth_rejected`);
    }

    const { accessToken, refreshToken } = result.data;

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
    };

    
    res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    
    return res.redirect(`${ENV.FRONTEND_URL}/dashboard`);

  } catch (error) {
    
    console.error("Callback Server Error:", error);
    return res.redirect(`${ENV.FRONTEND_URL}/login?error=server_error`);
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Fetch the fresh user info directly from DB based on ID from JWT token
    const [user] = await db.select({
      id: users.id,
      githubId: users.githubId,
      email: users.email,
      username: users.username,
      avatarUrl: users.avatarUrl
    }).from(users).where(eq(users.id, req.user.id));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user, // Pass the explicit DB result
    });

  } catch (error) {
    console.error("fetching user Error:", error);
    return res.status(500).json({ message: "Server error fetching profile." });
  }
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({
        message: "Session expired. Please log in again.",
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      ENV.REFRESH_SECRET
    ) as { userId: number };
    
    
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId));
    
    if (!user) {
      throw new Error("User no longer exists");
    }

    // 🚨 FIX: Pass the full user object to the generator
    const newAccessToken = generateAccessToken(user);

    // Ensure your cookie options are consistent with your other controllers
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: true, 
      sameSite: "lax", // Updated to "lax" for consistency with callback
      maxAge: 15 * 60 * 1000, 
    });

    return res.status(200).json({
      message: "Access token refreshed",
    });

  } catch (error) {
    // Invalid / expired refresh token
    res.clearCookie("accessToken", { secure: true, sameSite: "lax", httpOnly: true });
    res.clearCookie("refreshToken", { secure: true, sameSite: "lax", httpOnly: true });
    
    console.error("Refresh token error:", error);
    return res.status(401).json({
      message: "Session expired. Please log in again.", 
    });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie("accessToken", { secure: true, sameSite: "lax", httpOnly: true });
  res.clearCookie("refreshToken", { secure: true, sameSite: "lax", httpOnly: true });
  return res.status(200).json({ success: true, message: "Logged out successfully" });
};