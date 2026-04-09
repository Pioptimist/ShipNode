import { Request, Response } from "express";
import * as authService from "../services/authService.js";
import { ENV } from "../lib/env.js";

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