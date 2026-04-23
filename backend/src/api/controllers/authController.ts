import { Request, Response } from "express";
import * as authService from "../services/authService.js";
import { ENV } from "../../lib/env.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import jwt from "jsonwebtoken";
import { generateAccessToken } from "../../utils/jwt.js";

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
    
    return res.status(200).json({
      success: true,
      data: req.user,
    });

  } catch (error) {
    console.error("fetching user Error:", error);
    return res.status(500).json({ message: "Server error fetching profile." });
  }
};

export const refreshAccessToken = (req: Request, res: Response) => {
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
    
    // Generate new access token using the correct userId property
    const newAccessToken = generateAccessToken(decoded.userId);

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 15 * 60 * 1000, // 15 min to match generateAccessToken
    });

    return res.status(200).json({
      message: "Access token refreshed",
    });

  } catch (error) {
    // Invalid / expired refresh token
    res.clearCookie("accessToken", { secure: true, sameSite: "none", httpOnly: true });
    res.clearCookie("refreshToken", { secure: true, sameSite: "none", httpOnly: true });
    console.error("Refresh token error:", error);
    return res.status(401).json({
      message: "Session expired. Please log in again.", 
    });
  }
};