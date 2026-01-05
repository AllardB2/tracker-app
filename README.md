# 📍 GPS Tracker Web App

Complete minimale GPS tracking applicatie met backend API, database, en live kaart interface.

## 🎯 Features

- **Backend API** - Node.js + Express met Prisma ORM
- **Database** - SQLite voor eenvoudige deployment
- **Live Kaart** - Leaflet + OpenStreetMap
- **Auto-update** - Locaties worden elke 5 seconden ververst
- **Multi-tracker** - Ondersteuning voor meerdere trackers
- **API Security** - API key authenticatie voor tracker endpoints
- **Responsive** - Werkt op desktop en mobile

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend

# Installeer dependencies
npm install

# Database is al geïnitialiseerd, maar je kunt het opnieuw doen met:
npx prisma db push

# Start de backend server
npm run dev
```

De API draait nu op `http://localhost:3000`

### 2. Frontend Setup

Open `frontend/index.html` in je browser, of gebruik een eenvoudige HTTP server:

```bash
# Optie 1: Python
cd frontend
python3 -m http.server 3001

# Optie 2: Node.js (npx)
cd frontend
npx -y serve -p 3001

# Optie 3: VS Code Live Server extensie
```

Open `http://localhost:3001` in je browser.

## 📡 API Endpoints

### POST /location

Tracker stuurt locatie naar server.

**Headers:**

```
x-api-key: dev-secret-key-12345
Content-Type: application/json
```

**Request:**

```json
{
  "trackerId": "tracker-1",
  "latitude": 53.2194,
  "longitude": 6.5665
}
```

**Response:**

```json
{
  "status": "ok",
  "trackerId": "tracker-1",
  "storedAt": "2025-12-09T14:58:40.123Z"
}
```

### GET /location/latest?trackerId=tracker-1

Haal laatste locatie op voor een tracker.

**Response:**

```json
{
  "trackerId": "tracker-1",
  "latitude": 53.2194,
  "longitude": 6.5665,
  "timestamp": "2025-12-09T14:58:40.123Z"
}
```

### GET /location/history?trackerId=tracker-1&limit=100

Haal locatie geschiedenis op.

**Response:**

```json
{
  "trackerId": "tracker-1",
  "count": 10,
  "locations": [
    {
      "latitude": 53.2194,
      "longitude": 6.5665,
      "timestamp": "2025-12-09T14:58:40.123Z"
    }
  ]
}
```

### GET /trackers

Haal alle tracker IDs op.

**Response:**

```json
{
  "trackers": ["tracker-1", "tracker-2"]
}
```

## 🧪 Testing

### Test met curl

```bash
# Stuur een locatie (Groningen)
curl -X POST http://localhost:3000/location \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-secret-key-12345" \
  -d '{
    "trackerId": "tracker-1",
    "latitude": 53.2194,
    "longitude": 6.5665
  }'

# Haal laatste locatie op
curl "http://localhost:3000/location/latest?trackerId=tracker-1"

# Haal alle trackers op
curl http://localhost:3000/trackers
```

### Test met meerdere trackers

```bash
# Amsterdam
curl -X POST http://localhost:3000/location \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-secret-key-12345" \
  -d '{
    "trackerId": "tracker-amsterdam",
    "latitude": 52.3676,
    "longitude": 4.9041
  }'

# Rotterdam
curl -X POST http://localhost:3000/location \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-secret-key-12345" \
  -d '{
    "trackerId": "tracker-rotterdam",
    "latitude": 51.9225,
    "longitude": 4.47917
  }'
```

## 📱 Simuleer GPS Tracker

Je kunt een simpel script maken om een bewegende tracker te simuleren:

```bash
#!/bin/bash
# simulate-tracker.sh

API_KEY="dev-secret-key-12345"
TRACKER_ID="tracker-test"
LAT=53.2194
LNG=6.5665

while true; do
  # Voeg kleine random variatie toe
  LAT=$(echo "$LAT + (RANDOM % 20 - 10) * 0.0001" | bc)
  LNG=$(echo "$LNG + (RANDOM % 20 - 10) * 0.0001" | bc)

  curl -X POST http://localhost:3000/location \
    -H "Content-Type: application/json" \
    -H "x-api-key: $API_KEY" \
    -d "{\"trackerId\":\"$TRACKER_ID\",\"latitude\":$LAT,\"longitude\":$LNG}"

  echo ""
  sleep 10
done
```

## 🗂️ Project Structure

```
tracker-app/
├── backend/
│   ├── package.json
│   ├── .env
│   ├── .env.example
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── index.js              # Main server
│       ├── config/
│       │   └── env.js            # Environment config
│       ├── db/
│       │   └── client.js         # Prisma client
│       ├── routes/
│       │   └── locationRoutes.js # API routes
│       ├── controllers/
│       │   └── locationController.js # Request handlers
│       ├── services/
│       │   └── locationService.js    # Business logic
│       └── middleware/
│           ├── errorHandler.js   # Error handling
│           └── apiKeyAuth.js     # API key auth
├── frontend/
│   ├── index.html               # Main HTML
│   ├── style.css                # Styling
│   └── app.js                   # Map & API logic
└── README.md
```

## ⚙️ Configuration

### Backend Environment Variables

Edit `backend/.env`:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
API_KEY=your-secret-api-key-change-this
CORS_ORIGIN=http://localhost:5173,http://localhost:3001
```

### Frontend Configuration

Edit `frontend/app.js`:

```javascript
const API_BASE_URL = "http://localhost:3000";
const UPDATE_INTERVAL = 5000; // 5 seconds
```

## 🔐 Security

- **API Key**: POST /location vereist `x-api-key` header
- **CORS**: Configureerbaar via environment variable
- **Input Validation**: Zod schemas voor alle inputs
- **SQL Injection**: Preventie via Prisma ORM

## 📊 Database

SQLite database met Prisma ORM. Bekijk de database met:

```bash
cd backend
npx prisma studio
```

## 🚢 Deployment

### Backend

1. Verander `NODE_ENV=production` in `.env`
2. Update `API_KEY` naar een veilige waarde
3. Voor productie: overweeg PostgreSQL i.p.v. SQLite
4. Deploy naar Heroku, Railway, Render, etc.

### Frontend

1. Upload naar static hosting (Netlify, Vercel, GitHub Pages)
2. Update `API_BASE_URL` in `app.js` naar je productie API URL

## 🔧 Development Scripts

```bash
# Backend
npm run dev      # Start met auto-reload
npm start        # Start zonder auto-reload
npm run db:push  # Push schema naar database
npm run db:studio # Open Prisma Studio

# Frontend
# Gebruik een HTTP server naar keuze
```

## 📝 License

MIT

## 🤝 Contributing

Dit is een POC/MVP. Voor productie gebruik:

- Rate limiting
- WebSockets voor real-time updates
- PostgreSQL database
- User authentication
- HTTPS
- Error monitoring (Sentry)
- Logging (Winston)
