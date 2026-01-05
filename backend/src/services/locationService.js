import prisma from "../db/client.js";

export const locationService = {
  /**
   * Store a new location for a tracker
   */
  async storeLocation(
    trackerId,
    latitude,
    longitude,
    altitude = 0,
    heading = 0,
    status = "moving",
    obstacleType = null
  ) {
    const location = await prisma.location.create({
      data: {
        trackerId,
        latitude,
        longitude,
        altitude,
        heading,
        status,
        obstacleType,
      },
    });

    return location;
  },

  /**
   * Get the latest location for a specific tracker
   */
  async getLatestLocation(trackerId) {
    const location = await prisma.location.findFirst({
      where: { trackerId },
      orderBy: { createdAt: "desc" },
    });

    return location;
  },

  /**
   * Get location history for a tracker
   */
  async getLocationHistory(trackerId, limit = 100) {
    const locations = await prisma.location.findMany({
      where: { trackerId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return locations;
  },

  /**
   * Get all unique tracker IDs
   */
  async getAllTrackerIds() {
    const trackers = await prisma.location.findMany({
      select: { trackerId: true },
      distinct: ["trackerId"],
    });

    return trackers.map((t) => t.trackerId);
  },
  /**
   * Delete all locations for a tracker
   */
  async clearHistory(trackerId) {
    return await prisma.location.deleteMany({
      where: { trackerId },
    });
  },
};
