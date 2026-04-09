import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
// (Note: In Node ES Modules, we import the .js extension even though the file is .ts)
import { ENV } from "./lib/env.js";
import { db } from "./db/index.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173"], 
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, 
  })
);

app.use(express.json());
app.use(cookieParser());


app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ message: "ShipNode is up and running" });
});

app.use("/api/auth", authRoutes);

const startServer = async () => {
  try {
    const res = await db.execute("SELECT 1 as ok");
    console.log(res.rows[0]);
    app.listen(ENV.PORT, () => {
      console.log(`Server is running on http://localhost:${ENV.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();