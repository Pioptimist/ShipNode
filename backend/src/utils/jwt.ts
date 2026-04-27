import jwt from "jsonwebtoken";
import { ENV } from "../lib/env.js";



export const generateAccessToken = (user: { id: number | any; githubId: string; email?: string }) => {
  // Always ensure userId is just a number. If 'id' is a nested object, extract the numeric id.
  const numericId = typeof user.id === 'object' && user.id !== null ? user.id.id : user.id;

  return jwt.sign(
    { 
      userId: numericId, 
      githubId: user.githubId, 
      email: user.email 
    }, 
    ENV.ACCESS_SECRET, 
    { expiresIn: '15m' }
  );
};

export const generateRefreshToken = (userId: number) => {
  // The refresh token stays lean. Its only job is to prove the user's identity to the database later.
  return jwt.sign(
    { userId }, 
    ENV.REFRESH_SECRET, 
    { expiresIn: '7d' }
  );
};