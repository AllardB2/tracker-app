import { z } from "zod";
import { locationService } from "../services/locationService.js";
import { simulationService } from "../services/simulationService.js";

// Validation schemas
const postLocationSchema = z.object({
  trackerId: z.string().min(1, "trackerId is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  heading: z.number().optional(),
  status: z.enum(["moving", "delivered", "obstacle"]).optional(),
  obstacleType: z.string().nullable().optional(),
});

const getLatestSchema = z.object({
  trackerId: z.string().min(1, "trackerId is required"),
});

const getHistorySchema = z.object({
  trackerId: z.string().min(1, "trackerId is required"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 100)),
});

const deleteHistorySchema = z.object({
  trackerId: z.string().min(1, "trackerId is required"),
});

const startSimulationSchema = z.object({
  trackerId: z.string().min(1, "trackerId is required"),
  destination: z.array(z.number()).length(2),
});

const stopSimulationSchema = z.object({
  trackerId: z.string().min(1, "trackerId is required"),
});

export const locationController = {
  /**
   * POST /location - Store a new location
   */
  async postLocation(req, res, next) {
    try {
      const {
        trackerId,
        latitude,
        longitude,
        altitude,
        heading,
        status,
        obstacleType,
      } = postLocationSchema.parse(req.body);
      const sessionId = req.headers["x-session-id"] || "global";

      const location = await locationService.storeLocation(
        trackerId,
        latitude,
        longitude,
        altitude,
        heading,
        status,
        obstacleType,
        sessionId
      );

      res.status(200).json({
        status: "ok",
        trackerId: location.trackerId,
        storedAt: location.createdAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /location/latest - Get latest location for a tracker
   */
  async getLatestLocation(req, res, next) {
    try {
      const { trackerId } = getLatestSchema.parse(req.query);
      const sessionId = req.headers["x-session-id"] || "global";

      const location = await locationService.getLatestLocation(
        trackerId,
        sessionId
      );

      if (!location) {
        return res.status(404).json({
          error: "Not Found",
          message: `No location found for tracker: ${trackerId}`,
        });
      }

      res.status(200).json({
        trackerId: location.trackerId,
        latitude: location.latitude,
        longitude: location.longitude,
        altitude: location.altitude,
        heading: location.heading,
        status: location.status,
        obstacleType: location.obstacleType,
        timestamp: location.createdAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /location/history - Get location history for a tracker
   */
  async getLocationHistory(req, res, next) {
    try {
      const { trackerId, limit } = getHistorySchema.parse(req.query);
      const sessionId = req.headers["x-session-id"] || "global";

      const locations = await locationService.getLocationHistory(
        trackerId,
        sessionId,
        limit
      );

      res.status(200).json({
        trackerId,
        count: locations.length,
        locations: locations.map((loc) => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
          altitude: loc.altitude,
          heading: loc.heading,
          status: loc.status,
          obstacleType: loc.obstacleType,
          timestamp: loc.createdAt.toISOString(),
        })),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /trackers - Get all tracker IDs
   */
  async getAllTrackers(req, res, next) {
    try {
      const sessionId = req.headers["x-session-id"] || "global";
      const trackerIds = await locationService.getAllTrackerIds(sessionId);

      res.status(200).json({
        trackers: trackerIds,
      });
    } catch (error) {
      next(error);
    }
  },
  /**
   * DELETE /location/:trackerId - Clear location history
   */
  async deleteHistory(req, res, next) {
    try {
      const { trackerId } = deleteHistorySchema.parse(req.params);
      const sessionId = req.headers["x-session-id"] || "global";

      await locationService.clearHistory(trackerId, sessionId);

      // Also stop any active simulation
      simulationService.stopSimulation(trackerId, sessionId);

      res.status(200).json({
        status: "ok",
        message: `History cleared for tracker: ${trackerId}`,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /simulation/start - Start server-side simulation
   */
  async startSimulation(req, res, next) {
    try {
      const { trackerId, destination } = startSimulationSchema.parse(req.body);
      const sessionId = req.headers["x-session-id"] || "global";
      await simulationService.startSimulation(
        trackerId,
        destination,
        sessionId
      );
      res.status(200).json({ status: "ok", message: "Simulation started" });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /simulation/stop - Stop server-side simulation
   */
  async stopSimulation(req, res, next) {
    try {
      const { trackerId } = stopSimulationSchema.parse(req.body);
      const sessionId = req.headers["x-session-id"] || "global";
      simulationService.stopSimulation(trackerId, sessionId);
      res.status(200).json({ status: "ok", message: "Simulation stopped" });
    } catch (error) {
      next(error);
    }
  },
};
