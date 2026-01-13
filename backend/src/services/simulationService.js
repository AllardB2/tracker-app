import { locationService } from "./locationService.js";

class SimulationService {
  constructor() {
    this.activeSimulations = new Map();
  }

  async startSimulation(trackerId, destination, sessionId = "global") {
    const simKey = `${sessionId}:${trackerId}`;

    if (this.activeSimulations.has(simKey)) {
      console.log(
        `📡 Resetting existing simulation for ${trackerId} (Session: ${sessionId})`
      );
      this.stopSimulation(trackerId, sessionId);
    }

    console.log(
      `🚀 Starting server-side simulation for ${trackerId} (Session: ${sessionId}) to`,
      destination
    );

    // Initial state
    let lastLocation = await locationService.getLatestLocation(
      trackerId,
      sessionId
    );
    if (!lastLocation) {
      lastLocation = {
        latitude: 53.0969169,
        longitude: 6.8852919,
        altitude: 0,
        heading: 0,
        status: "moving",
      };
    }

    // Store initial location immediately so clients can find it
    await locationService.storeLocation(
      trackerId,
      lastLocation.latitude,
      lastLocation.longitude,
      lastLocation.altitude,
      lastLocation.heading,
      "moving",
      null,
      sessionId
    );

    let currentObstacle = null;
    let obstacleStepsRemaining = 0;
    let hasEncounteredFire = false;

    const intervalId = setInterval(async () => {
      try {
        const latestInfo = await locationService.getLatestLocation(
          trackerId,
          sessionId
        );
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
          console.log(
            `🏁 Destination reached for ${trackerId} (Session: ${sessionId})`
          );
          this.stopSimulation(trackerId, sessionId);
          await locationService.storeLocation(
            trackerId,
            destLat,
            destLng,
            0,
            0,
            "delivered",
            null,
            sessionId
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
          // Random obstacle logic
          if (distance > 0.003 && Math.random() > 0.95) {
            currentObstacle = Math.random() > 0.7 ? "fire" : "wind";
            if (currentObstacle === "fire") hasEncounteredFire = true;
            obstacleStepsRemaining = currentObstacle === "wind" ? 5 : 3;
            obstacleType = currentObstacle;
          }
          // Mandatory fire if we haven't seen one and we are halfway (approx)
          else if (distance < 0.015 && distance > 0.01 && !hasEncounteredFire) {
            currentObstacle = "fire";
            hasEncounteredFire = true;
            obstacleStepsRemaining = 4;
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
          obstacleType,
          sessionId
        );
      } catch (err) {
        console.error(
          `❌ Simulation loop error for ${trackerId} (Session: ${sessionId}):`,
          err
        );
        this.stopSimulation(trackerId, sessionId);
      }
    }, 2000);

    this.activeSimulations.set(simKey, intervalId);
  }

  stopSimulation(trackerId, sessionId = "global") {
    const simKey = `${sessionId}:${trackerId}`;
    if (this.activeSimulations.has(simKey)) {
      clearInterval(this.activeSimulations.get(simKey));
      this.activeSimulations.delete(simKey);
      console.log(
        `⏹ Stopped simulation for ${trackerId} (Session: ${sessionId})`
      );
    }
  }
}

export const simulationService = new SimulationService();
