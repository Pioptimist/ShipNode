import jwt from "jsonwebtoken";
import { ENV } from "../lib/env.js";

export const generateAccessToken = (userId: number) => {
  return jwt.sign({ userId }, ENV.ACCESS_SECRET, {
    expiresIn: '15m', 
  });
};

export const generateRefreshToken = (userId: number) => {
  return jwt.sign({ userId }, ENV.REFRESH_SECRET, {
    expiresIn: '7d',
  });
};