import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import newsRoutes from "./routes/newsRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
const allowedOrigins = [
  "http://localhost:5173",
  "https://verify-2db20.web.app",
  "https://verify-2db20.firebaseapp.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
  })
);

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "VERIFYNews API" });
});

// Routes
app.use("/api/news", newsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
