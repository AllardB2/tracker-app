const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (for any CSS, JS files you might add later)
app.use(express.static(__dirname));

// Serve the HTML file at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

let lastLocation = null; // in het echt: database

// Tracker stuurt locatie
app.post("/location", (req, res) => {
  const { trackerId, latitude, longitude } = req.body;
  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Missing coordinates" });
  }

  lastLocation = {
    trackerId: trackerId || "default",
    latitude,
    longitude,
    timestamp: new Date().toISOString(),
  };

  res.json({ status: "ok" });
});

// Web app haalt laatste locatie op
app.get("/location/latest", (req, res) => {
  if (!lastLocation) {
    return res.status(404).json({ error: "No location yet" });
  }
  res.json(lastLocation);
});

app.listen(3000, () => {
  console.log("API running on http://localhost:3000");
});
