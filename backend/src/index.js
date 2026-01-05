import express from "express";
import cors from "cors";
import { config } from "./config/env.js";
import locationRoutes from "./routes/locationRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { locationService } from "./services/locationService.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
app.use("/api", locationRoutes);

// Serve static frontend files in production or if requested
const frontendPath = path.join(__dirname, "../../frontend");
app.use(express.static(frontendPath));

// Fallback for SPA (if we had routing) or just index.html
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Error handling (must be last)
app.use(errorHandler);

// Seed default drone
async function seedDefaultDrone() {
  try {
    const trackerId = "pakket-ids-lennart";
    const existing = await locationService.getLatestLocation(trackerId);
    if (!existing) {
      console.log(`🌱 Seeding default drone: ${trackerId}`);
      await locationService.storeLocation(
        trackerId,
        53.097314,
        6.8884769,
        30,
        0,
        "moving"
      );
    }
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  }
}

// Start server
const server = app.listen(config.port, async () => {
  await seedDefaultDrone();
  console.log(`🚀 GPS Tracker API running on http://localhost:${config.port}`);
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🔐 CORS enabled for: ${config.corsOrigin.join(", ")}`);
});
