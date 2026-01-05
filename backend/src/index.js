import express from "express";
import cors from "cors";
import { config } from "./config/env.js";
import locationRoutes from "./routes/locationRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/", locationRoutes);

// Error handling (must be last)
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`🚀 GPS Tracker API running on http://localhost:${config.port}`);
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🔐 CORS enabled for: ${config.corsOrigin.join(", ")}`);
});
