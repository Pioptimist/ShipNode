import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { ENV } from "../lib/env.js";

// 1. Tell TypeScript that this specific Request will contain our user
export interface AuthRequest extends Request {
  user?: any; // You can replace 'any' with your actual Drizzle User type later for strictness
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
 
    const token = req.cookies.accessToken;
    if (!token) {
      return res.status(401).json({ message: "Not authenticated. No token found." });
    }
    
    const decoded = jwt.verify(token, ENV.ACCESS_SECRET) as { id: number };
    const [user] = await db.select().from(users).where(eq(users.id, decoded.id));

    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }
    const { githubAccessToken, ...safeUser } = user;
    req.user = safeUser;
    next();
    
  } catch (error) {
    console.error("Auth Middleware Error:", error);

    return res.status(401).json({ message: "Invalid or expired access token." });
  }
};