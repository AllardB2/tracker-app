import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  apiKey: process.env.API_KEY,
  corsOrigin: process.env.CORS_ORIGIN?.split(",") || [
    "http://localhost:5173",
    "http://localhost:8080",
  ],
};

// Validate required env vars
if (!config.apiKey) {
  throw new Error("API_KEY environment variable is required");
}
