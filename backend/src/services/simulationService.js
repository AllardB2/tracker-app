import { locationService } from "./locationService.js";

class SimulationService {
  constructor() {
    this.activeSimulations = new Map();
  }

  async startSimulation(trackerId, destination) {
    if (this.activeSimulations.has(trackerId)) {
      console.log(`📡 Taking over existing simulation for ${trackerId}`);
      this.stopSimulation(trackerId);
    }

    console.log(
      `🚀 Starting server-side simulation for ${trackerId} to`,
      destination
    );

    // Initial state
    let lastLocation = await locationService.getLatestLocation(trackerId);
    if (!lastLocation) {
      lastLocation = {
        latitude: 53.2284,
        longitude: 6.5416,
        altitude: 0,
        heading: 0,
        status: "moving",
      };
    }

    let currentObstacle = null;
    let obstacleStepsRemaining = 0;

    const intervalId = setInterval(async () => {
      try {
        const latestInfo = await locationService.getLatestLocation(trackerId);
        const [destLat, destLng] = destination;

        const currentLat = latestInfo
          ? latestInfo.latitude
          : lastLocation.latitude;
        const currentLng = latestInfo
          ? latestInfo.longitude
          : lastLocation.longitude;

        const distLat = destLat - currentLat;
        const distLng = destLng - currentLng;
        const distance = Math.sqrt(distLat * distLat + distLng * distLng);

        if (distance < 0.0005) {
          console.log(`🏁 Destination reached for ${trackerId}`);
          this.stopSimulation(trackerId);
          await locationService.storeLocation(
            trackerId,
            destLat,
            destLng,
            0,
            0,
            "delivered"
          );
          return;
        }

        // Move towards destination
        const moveSpeed = currentObstacle === "wind" ? 0.05 : 0.1;
        let stepLat = currentLat + distLat * moveSpeed;
        let stepLng = currentLng + distLng * moveSpeed;
        const heading = (Math.atan2(distLng, distLat) * 180) / Math.PI;

        // Handle persistent obstacles
        let obstacleType = null;
        if (obstacleStepsRemaining > 0) {
          obstacleType = currentObstacle;
          obstacleStepsRemaining--;
          if (obstacleType === "fire") {
            stepLat += 0.0004;
            stepLng += 0.0004;
          }
        } else {
          currentObstacle = null;
          if (distance > 0.003 && Math.random() > 0.95) {
            currentObstacle = Math.random() > 0.7 ? "fire" : "wind";
            obstacleStepsRemaining = currentObstacle === "wind" ? 5 : 3;
            obstacleType = currentObstacle;
          }
        }

        await locationService.storeLocation(
          trackerId,
          stepLat,
          stepLng,
          30 + Math.random() * 5,
          heading,
          "moving",
          obstacleType
        );
      } catch (err) {
        console.error(`❌ Simulation loop error for ${trackerId}:`, err);
        this.stopSimulation(trackerId);
      }
    }, 2000);

    this.activeSimulations.set(trackerId, intervalId);
  }

  stopSimulation(trackerId) {
    if (this.activeSimulations.has(trackerId)) {
      clearInterval(this.activeSimulations.get(trackerId));
      this.activeSimulations.delete(trackerId);
      console.log(`⏹ Stopped simulation for ${trackerId}`);
    }
  }
}

export const simulationService = new SimulationService();
