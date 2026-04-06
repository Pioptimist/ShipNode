import dotenv from "dotenv";



dotenv.config({override : true});
const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is missing in .env`);
  }
  return value;
};

export const ENV = {
  // Server
  PORT: parseInt(getEnv("PORT"), 10),
  DB_URL: getEnv("DB_URL")

};
//   FRONTEND_URL: getEnv("FRONTEND_URL"),

//   // Database
//   

//   // Security & Auth
//   ENCRYPTION_KEY: getEnv("ENCRYPTION_KEY"), // The 32-byte AES-256 key
//   GITHUB_CLIENT_ID: getEnv("GITHUB_CLIENT_ID"),
//   GITHUB_CLIENT_SECRET: getEnv("GITHUB_CLIENT_SECRET"),
//   JWT_SECRET: getEnv("JWT_SECRET"),

//   // Cloudflare R2 Storage
//   R2_ACCESS_KEY_ID: getEnv("R2_ACCESS_KEY_ID"),
//   R2_SECRET_ACCESS_KEY: getEnv("R2_SECRET_ACCESS_KEY"),
//   R2_ENDPOINT: getEnv("R2_ENDPOINT"),
//   R2_BUCKET_NAME: getEnv("R2_BUCKET_NAME"),
//   R2_PUBLIC_URL: process.env.R2_PUBLIC_URL, // Optional, so we don't force it via getEnv