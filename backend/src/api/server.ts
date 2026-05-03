import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";

// (Note: In Node ES Modules, we import the .js extension even though the file is .ts)
import { ENV } from "../lib/env.js";
import { db } from "../db/index.js";
import authRoutes from "./routes/authRoutes.js";
import githubRoutes from "./routes/githubRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import { initializeSockets } from "./socket/socket.js"; 
import deploymentRoutes from "./routes/deploymentRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();
const server = http.createServer(app);


initializeSockets(server);

app.use(
  cors({
    origin: ["http://localhost:5173"], 
    methods: ["GET", "POST", "PUT", "DELETE","PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, 
  })
);

// Capture raw body for GitHub webhooks BEFORE the general JSON parser
app.use("/api/webhooks/github", express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf; // Store the exact raw buffer GitHub sent
  }
}));

app.use(express.json());
app.use(cookieParser());


app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ message: "ShipNode is up and running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/deployments", deploymentRoutes);
app.use("/api/users", userRoutes);

const startServer = async () => {
  try {
    const res = await db.execute("SELECT 1 as ok");
    console.log("Database connected:", res.rows[0]);
    

    server.listen(ENV.PORT, () => {
      console.log(`Server is running on http://localhost:${ENV.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();