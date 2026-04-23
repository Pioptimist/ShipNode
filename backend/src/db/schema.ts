import { pgTable, serial, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";

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
  
  // Custom Domains & Security
  customDomain: varchar("custom_domain", { length: 255 }).unique(), 
  domainVerified: boolean("domain_verified").default(false), // Prevents hijacking
  
  domainVerificationToken: varchar("domain_verification_token", { length: 255 }),
  // The Instant Rollback Pointer (Which deployment is currently live?)
  activeDeploymentId: integer("active_deployment_id"), // Can be null when project is first created
  
  // Build Config
  repoName: varchar("repo_name", { length: 255 }).notNull(), 
  // Add this to your projects schema
  rootDirectory: varchar("root_directory", { length: 255 }).default("/"),
  framework: varchar("framework", { length: 50 }).default("VITE"), 
  installCommand: varchar("install_command", { length: 255 }).default("npm install"),
  buildCommand: varchar("build_command", { length: 255 }).default("npm run build"),
  outputDirectory: varchar("output_directory", { length: 255 }).default("dist"),

  createdAt: timestamp("created_at").defaultNow(),
});

// 3. The Build Queue & History
export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  
  // Expanded Status Tracking
  status: varchar("status", { length: 50 }).notNull().default("QUEUED"), // QUEUED, BUILDING, UPLOADING, READY, FAILED, CANCELLED
  
  // Webhook & Git Info
  branch: varchar("branch", { length: 255 }).notNull().default("main"),
  commitHash: varchar("commit_hash", { length: 40 }), 
  commitMessage: text("commit_message"),
  
  // Routing & Previews
  storagePath: text("storage_path"), // e.g., "s3://shipnode/proj_123/deploy_456"
  previewUrl: varchar("preview_url", { length: 255 }).unique(), // e.g., "feat-login-98a7.shipnode.app"
  
  // UX & Analytics
  buildLogsUrl: text("build_logs_url"), // URL to the S3 text file for the Dashboard terminal
  buildTimeMs: integer("build_time_ms"), 

  createdAt: timestamp("created_at").defaultNow(),
});

// 4. Analytics & Traffic Logging
export const requestLogs = pgTable("request_logs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }), 
  userAgent: text("user_agent"),
  requestPath: text("request_path"), 
  responseTimeMs: integer("response_time_ms"), 
  createdAt: timestamp("created_at").defaultNow(),
});

// 5. WAF (Web Application Firewall)
export const blockedIps = pgTable("blocked_ips", {
  id: serial("id").primaryKey(),
  ipAddress: varchar("ip_address", { length: 45 }).unique().notNull(),
  reason: text("reason"), 
  createdAt: timestamp("created_at").defaultNow(),
});

// 6. Environment Variables Vault
export const projectEnvs = pgTable("project_envs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  key: varchar("key", { length: 255 }).notNull(), // e.g., "DATABASE_URL"
  value: text("value").notNull(), // AES-256 encrypted string
  target: varchar("target", { length: 50 }).default("ALL"), // 'PRODUCTION', 'PREVIEW', 'ALL'
  createdAt: timestamp("created_at").defaultNow(),
});