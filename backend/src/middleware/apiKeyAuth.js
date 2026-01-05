import { config } from "../config/env.js";

export const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "API key is required. Provide x-api-key header.",
    });
  }

  if (apiKey !== config.apiKey) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid API key",
    });
  }

  next();
};
