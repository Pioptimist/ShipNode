import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "../../lib/env.js";

// 1. Tell TypeScript that this specific Request will contain our user
export interface AuthRequest extends Request {
  user?: { id: number; githubId: string; email?: string }; 
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) {
      return res.status(401).json({ message: "Not authenticated. No token found." });
    }
    
    // 1. Verify the token
    const decoded = jwt.verify(token, ENV.ACCESS_SECRET) as { 
      userId: number;
      githubId: string; 
      email: string 
    };
    
    req.user = {
      id: decoded.userId,
      githubId: decoded.githubId,
      email: decoded.email
    };

    next();
      
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(401).json({ message: "Invalid or expired access token." });
  }
};