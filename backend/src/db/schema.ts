import { pgTable, serial, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";

// 1. Core Auth
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  githubId: varchar("github_id", { length: 255 }).unique().notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  githubAccessToken: text("github_access_token").notNull(), // AES-256 encrypted
  createdAt: timestamp("created_at").defaultNow(),
});

// 2. The Apps
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  subdomain: varchar("subdomain", { length: 255 }).unique().notNull(), 
  customDomain: varchar("custom_domain", { length: 255 }).unique(), // Added for custom domain mapping
  repoName: varchar("repo_name", { length: 255 }).notNull(), 
  createdAt: timestamp("created_at").defaultNow(),
});

// 3. The Build Queue
export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("QUEUED"), // QUEUED, BUILDING, READY, FAILED
  createdAt: timestamp("created_at").defaultNow(),
});


// Every time a user visits a hosted project, the proxy logs it here
export const requestLogs = pgTable("request_logs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }), // 45 chars safely covers IPv6 addresses
  userAgent: text("user_agent"),
  requestPath: text("request_path"), // e.g., "/about"
  responseTimeMs: integer("response_time_ms"), // Great for dashboard charts showing site speed
  createdAt: timestamp("created_at").defaultNow(),
});

// 5. WAF (Web Application Firewall)
// The proxy will check this table to block malicious IPs from hitting your users' sites
export const blockedIps = pgTable("blocked_ips", {
  id: serial("id").primaryKey(),
  ipAddress: varchar("ip_address", { length: 45 }).unique().notNull(),
  reason: text("reason"), // e.g., "DDoS attempt", "Rate limit exceeded"
  createdAt: timestamp("created_at").defaultNow(),
});