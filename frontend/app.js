// Configuration
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000/api"
    : "/api";
const UPDATE_INTERVAL = 3000;
const DEFAULT_ZOOM = 16;
const DESTINATION = [53.2407722, 6.5357325]; // Hanze Hogeschool Groningen

// State
let map = null;
let droneMarker = null;
let destinationMarker = null;
let pathSegments = []; // Array of Leaflet polyline segments
let currentTrackerId = null;
let updateTimer = null;
let vpnMode = false;
let allPositions = []; // To store last position for segmenting
let lastLocation = null;
let currentObstacle = null;
let obstacleStepsRemaining = 0;

// DOM Elements
const trackerSelect = document.getElementById("trackerSelect");
const vpnToggle = document.getElementById("vpnMode");
const statusElement = document.getElementById("status");
const statusText = statusElement.querySelector(".status-text");
const droneStatusBadge = document.getElementById("droneStatusBadge");
const infoTrackerId = document.getElementById("infoTrackerId");
const infoCoords = document.getElementById("infoCoords");
const infoAlt = document.getElementById("infoAlt");
const infoHeading = document.getElementById("infoHeading");
const infoETA = document.getElementById("infoETA");
const infoTime = document.getElementById("infoTime");
const alertContainer = document.getElementById("alertContainer");
const alertMessage = document.getElementById("alertMessage");
const deliveryOverlay = document.getElementById("deliveryOverlay");
const deliveredTime = document.getElementById("deliveredTime");
const deliveredDrone = document.getElementById("deliveredDrone");
const closeOverlayBtn = document.getElementById("closeOverlay");
const simulateFlightBtn = document.getElementById("simulateFlight");
const resetDroneBtn = document.getElementById("resetDrone");

// Deployment Resilience Elements
let simulationInterval = null;

function getApiKey() {
  return localStorage.getItem("drone_api_key") || "dev-secret-key-12345";
}

// Initialize map
function initMap() {
  map = L.map("map", {
    zoomControl: false,
    attributionControl: false,
  }).setView([53.2407, 6.5357], 14);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 20,
  }).addTo(map);

  L.control.zoom({ position: "bottomright" }).addTo(map);

  // Add destination marker
  const destIcon = L.divIcon({
    className: "destination-icon",
    html: '<div style="background: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px #ef4444;"></div>',
    iconSize: [12, 12],
  });

  destinationMarker = L.marker(DESTINATION, { icon: destIcon })
    .addTo(map)
    .bindPopup("<strong>Bestemming</strong><br>Hanze Hogeschool Groningen");

  // Map Click Listener for VPN Mode
  map.on("click", onMapClick);

  console.log("✅ Map initialized with Dark Theme");
}

async function onMapClick(e) {
  if (!vpnMode || !currentTrackerId) return;

  const { lat, lng } = e.latlng;
  await postLocation(
    lat,
    lng,
    25 + Math.random() * 5,
    Math.random() * 360,
    "moving"
  );
  fetchLatestLocation();
}

// Update UI
function updateStatus(type, message) {
  statusElement.className = "status " + type;
  statusText.textContent = message;
}

function updateInfoPanel(data) {
  infoTrackerId.textContent = data.trackerId;
  infoCoords.textContent = `${data.latitude.toFixed(
    5
  )}, ${data.longitude.toFixed(5)}`;
  infoAlt.textContent = `${Math.round(data.altitude || 0)}m`;
  infoHeading.textContent = `${Math.round(data.heading || 0)}°`;
  infoTime.textContent = new Date(data.timestamp).toLocaleTimeString("nl-NL");

  droneStatusBadge.textContent =
    data.status === "delivered" ? "Delivered" : "In Flight";
  droneStatusBadge.className = `badge ${
    data.status === "delivered" ? "success" : ""
  }`;

  // Calculate ETA
  if (data.status !== "delivered") {
    const [destLat, destLng] = DESTINATION;
    const distance = Math.sqrt(
      Math.pow(destLat - data.latitude, 2) +
        Math.pow(destLng - data.longitude, 2)
    );

    // speedFactor is approx degrees per step in simulation (10% of distance is roughly 0.001-0.005 degrees)
    // We can use a simpler estimation: steps = ln(distance/target_dist) / ln(0.9)
    // Or just a linear estimate for the UI:
    const speed =
      data.status === "obstacle" && data.obstacleType === "wind"
        ? 0.0005
        : 0.001;
    const secondsRemaining = (distance / speed) * (UPDATE_INTERVAL / 1000);

    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = Math.floor(secondsRemaining % 60);

    if (hours > 0) {
      infoETA.textContent = `${hours}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    } else {
      infoETA.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
  } else {
    infoETA.textContent = "--:--";
  }

  if (data.obstacleType) {
    alertContainer.style.display = "block";
    alertMessage.textContent =
      data.obstacleType === "fire"
        ? "Brand gedetecteerd - Omvliegen"
        : "Tegenwind gedetecteerd";
  } else {
    alertContainer.style.display = "none";
  }

  if (data.status === "delivered" && lastLocation?.status !== "delivered") {
    showDeliverySuccess(data);
  }
}

function updateDroneMarker(
  lat,
  lng,
  heading,
  obstacleType = null,
  status = "moving"
) {
  const position = [lat, lng];

  const droneIconHtml = `
    <div class="drone-icon" style="transform: rotate(${heading}deg);">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 4V28M4 16H28M8 8L24 24M24 8L8 24" stroke="#2563EB" stroke-width="3" stroke-linecap="round"/>
        <circle cx="16" cy="16" r="4" fill="#2563EB" stroke="white" stroke-width="2"/>
      </svg>
    </div>
  `;

  const droneIcon = L.divIcon({
    className: "drone-div-icon",
    html: droneIconHtml,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  if (droneMarker) {
    droneMarker.setLatLng(position);
    droneMarker.setIcon(droneIcon);
  } else {
    droneMarker = L.marker(position, { icon: droneIcon }).addTo(map);
  }

  // Path Segment logic
  if (allPositions.length > 0) {
    const lastPos = allPositions[allPositions.length - 1];

    let segmentColor = "#2563EB"; // Default blue
    let dashStyle = "5, 10";

    if (obstacleType === "wind") {
      segmentColor = "#f59e0b"; // Yellow/Amber
      dashStyle = "2, 5";
    } else if (obstacleType === "fire") {
      segmentColor = "#ef4444"; // Red
      dashStyle = ""; // Solid
    }

    const segment = L.polyline([lastPos, position], {
      color: segmentColor,
      weight: 4,
      dashArray: dashStyle,
      opacity: 0.8,
    }).addTo(map);

    pathSegments.push(segment);
  }

  allPositions.push(position);

  // Dynamic Zoom: zoom in as we get closer to destination
  const [destLat, destLng] = DESTINATION;
  const dist = Math.sqrt(
    Math.pow(destLat - lat, 2) + Math.pow(destLng - lng, 2)
  );

  let targetZoom = 13;
  if (dist < 0.002) targetZoom = 18;
  else if (dist < 0.005) targetZoom = 17;
  else if (dist < 0.01) targetZoom = 16;
  else if (dist < 0.02) targetZoom = 15;
  else if (dist < 0.05) targetZoom = 14;
  else if (dist < 0.1) targetZoom = 13;
  else if (dist < 0.2) targetZoom = 11;
  else targetZoom = 9;

  if (status !== "delivered") {
    map.setView(position, targetZoom, { animate: true });
  }
}

function showDeliverySuccess(data) {
  deliveredTime.textContent = new Date(data.timestamp).toLocaleTimeString(
    "nl-NL"
  );
  deliveredDrone.textContent = data.trackerId;
  deliveryOverlay.style.display = "grid";
}

// Fetching
async function fetchLatestLocation() {
  if (!currentTrackerId) return;

  try {
    updateStatus("active", "Syncing...");
    const response = await fetch(
      `${API_BASE_URL}/location/latest?trackerId=${currentTrackerId}`,
      { headers: { "x-api-key": getApiKey() } }
    );

    if (response.status === 401) {
      updateStatus("error", "Invalid API Key");
      return;
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    updateDroneMarker(
      data.latitude,
      data.longitude,
      data.heading || 0,
      data.obstacleType,
      data.status
    );
    updateInfoPanel(data);
    lastLocation = data;
    updateStatus("active", "Live");
  } catch (error) {
    console.error("❌ Fetch error:", error);
    updateStatus("error", "Offline");
  }
}

async function loadTrackers() {
  try {
    const response = await fetch(`${API_BASE_URL}/trackers`, {
      headers: { "x-api-key": getApiKey() },
    });

    if (response.status === 401) {
      updateStatus("error", "🔑 API Key Required");
      return;
    }

    const data = await response.json();

    const currentVal = trackerSelect.value;
    trackerSelect.innerHTML = '<option value="">Selecteer drone...</option>';

    data.trackers.forEach((id) => {
      const opt = document.createElement("option");
      opt.value = opt.textContent = id;
      trackerSelect.appendChild(opt);
    });

    if (currentVal) trackerSelect.value = currentVal;
    else if (data.trackers.length > 0) {
      trackerSelect.value = data.trackers[0];
      currentTrackerId = data.trackers[0];
      startAutoUpdate();
    } else {
      updateStatus("", "Geen drones gevonden");
    }
  } catch (err) {
    updateStatus("error", "API Error");
  }
}

function startAutoUpdate() {
  if (updateTimer) clearInterval(updateTimer);
  fetchLatestLocation();
  updateTimer = setInterval(fetchLatestLocation, UPDATE_INTERVAL);
}

function clearPath() {
  pathSegments.forEach((segment) => map.removeLayer(segment));
  pathSegments = [];
  allPositions = [];
}

// Event Listeners
trackerSelect.addEventListener("change", (e) => {
  currentTrackerId = e.target.value;
  clearPath();
  currentObstacle = null;
  obstacleStepsRemaining = 0;
  if (currentTrackerId) startAutoUpdate();
  else updateStatus("", "Ready");
});

vpnToggle.addEventListener("change", (e) => {
  vpnMode = e.target.checked;
  statusText.textContent = vpnMode ? "VPN ON - Click Map" : "Live";
});

closeOverlayBtn.addEventListener("click", () => {
  deliveryOverlay.style.display = "none";
});

async function startSimulation() {
  if (!currentTrackerId) return;
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    simulateFlightBtn.textContent = "🚀 Start Autonome Vlucht";
    return;
  }

  simulateFlightBtn.textContent = "⏹ Stop Simulatie";
  clearPath();
  currentObstacle = null;
  obstacleStepsRemaining = 0;

  simulationInterval = setInterval(async () => {
    if (!lastLocation) {
      // Start near Groningen
      lastLocation = {
        latitude: 53.2284,
        longitude: 6.5416,
        altitude: 0,
        heading: 0,
      };
    }

    const { latitude, longitude } = lastLocation;
    const [destLat, destLng] = DESTINATION;

    // Calculate distance and step
    const distLat = destLat - latitude;
    const distLng = destLng - longitude;
    const distance = Math.sqrt(distLat * distLat + distLng * distLng);

    if (distance < 0.0005) {
      // Destination reached
      clearInterval(simulationInterval);
      simulationInterval = null;
      simulateFlightBtn.textContent = "🚀 Start Autonome Vlucht";

      // Send final location with status 'delivered'
      await postLocation(destLat, destLng, 0, 0, "delivered");
      return;
    }

    // Move towards destination (slower if wind)
    const moveSpeed = currentObstacle === "wind" ? 0.05 : 0.1;
    let stepLat = latitude + distLat * moveSpeed;
    let stepLng = longitude + distLng * moveSpeed;
    const heading = (Math.atan2(distLng, distLat) * 180) / Math.PI;

    // Handle persistent obstacles
    let obstacleType = null;
    if (obstacleStepsRemaining > 0) {
      obstacleType = currentObstacle;
      obstacleStepsRemaining--;

      if (obstacleType === "fire") {
        stepLat += 0.0004; // Detour
        stepLng += 0.0004;
      }
    } else {
      currentObstacle = null;
      // Chance to start new obstacle (less frequent, but lasts longer)
      if (distance > 0.003 && Math.random() > 0.95) {
        currentObstacle = Math.random() > 0.7 ? "fire" : "wind";
        obstacleStepsRemaining = currentObstacle === "wind" ? 5 : 3; // Wind lasts longer (5 steps = 10s)
        obstacleType = currentObstacle;
      }
    }

    await postLocation(
      stepLat,
      stepLng,
      30 + Math.random() * 5,
      heading,
      "moving",
      obstacleType
    );
  }, 2000);
}

async function postLocation(
  lat,
  lng,
  alt,
  heading,
  status,
  obstacleType = null
) {
  try {
    const response = await fetch(`${API_BASE_URL}/location`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getApiKey(),
      },
      body: JSON.stringify({
        trackerId: currentTrackerId,
        latitude: lat,
        longitude: lng,
        altitude: alt,
        heading: heading,
        status: status,
        obstacleType: obstacleType,
      }),
    });

    if (response.status === 401) {
      updateStatus("error", "Invalid API Key");
      return;
    }

    fetchLatestLocation();
  } catch (err) {
    console.error("❌ Post failed:", err);
  }
}

async function resetDrone() {
  if (!currentTrackerId) return;

  if (
    !confirm(
      `Weet je zeker dat je de geschiedenis van ${currentTrackerId} wilt wissen?`
    )
  ) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/location/${currentTrackerId}`,
      {
        method: "DELETE",
        headers: {
          "x-api-key": getApiKey(),
        },
      }
    );

    if (response.ok) {
      clearPath();
      lastLocation = null;
      if (droneMarker) {
        map.removeLayer(droneMarker);
        droneMarker = null;
      }
      pathSegments = [];
      allPositions = [];
      updateStatus("active", "Reset voltooid");
      setTimeout(() => updateStatus("active", "Ready"), 2000);
    }
  } catch (err) {
    console.error("❌ Reset failed:", err);
    updateStatus("error", "Reset mislukt");
  }
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadTrackers();
});

simulateFlightBtn.addEventListener("click", startSimulation);
resetDroneBtn.addEventListener("click", resetDrone);
