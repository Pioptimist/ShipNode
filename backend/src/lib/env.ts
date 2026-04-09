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
  DB_URL: getEnv("DB_URL"),
  GITHUB_CLIENT_ID: getEnv("GITHUB_CLIENT_ID"),
  API_URL: getEnv("API_URL"),
  GITHUB_CLIENT_SECRET: getEnv("GITHUB_CLIENT_SECRET"),
  ACCESS_SECRET: getEnv("ACCESS_SECRET"),
  REFRESH_SECRET: getEnv("REFRESH_SECRET"),
  ENCRYPTION_KEY: getEnv("ENCRYPTION_KEY"),
  FRONTEND_URL: getEnv("FRONTEND_URL"),

};


//   // Cloudflare R2 Storage
//   R2_ACCESS_KEY_ID: getEnv("R2_ACCESS_KEY_ID"),
//   R2_SECRET_ACCESS_KEY: getEnv("R2_SECRET_ACCESS_KEY"),
//   R2_ENDPOINT: getEnv("R2_ENDPOINT"),
//   R2_BUCKET_NAME: getEnv("R2_BUCKET_NAME"),
//   R2_PUBLIC_URL: process.env.R2_PUBLIC_URL, // Optional, so we don't force it via getEnv