import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DB_URL) {
  throw new Error('DATABASE_URL is missing in .env');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DB_URL,
  },
  verbose: true,
  strict: true,
});