import express from "express";
import { locationController } from "../controllers/locationController.js";
import { apiKeyAuth } from "../middleware/apiKeyAuth.js";

const router = express.Router();

// POST /location - requires API key
router.post("/location", apiKeyAuth, locationController.postLocation);

// GET /location/latest
router.get("/location/latest", locationController.getLatestLocation);

// GET /location/history
router.get("/location/history", locationController.getLocationHistory);

// GET /trackers - get all tracker IDs
router.get("/trackers", locationController.getAllTrackers);

// DELETE /location/:trackerId - clear history, requires API key
router.delete(
  "/location/:trackerId",
  apiKeyAuth,
  locationController.deleteHistory
);

export default router;
