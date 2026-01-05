# Gebruik Node 20 als base image
FROM node:20-slim

# Installeer OpenSSL (nodig voor Prisma)
RUN apt-get update -y && apt-get install -y openssl

# Werkmap instellen
WORKDIR /app

# Kopieer package files van root en backend
COPY package*.json ./
COPY backend/package*.json ./backend/

# Installeer dependencies (ook van de backend)
RUN npm install
RUN cd backend && npm install

# Kopieer de rest van de applicatie
COPY . .

# Genereer Prisma Client
RUN cd backend && npx prisma generate

# Omgevingsvariabelen (default waarden)
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:/data/drone.db"
ENV API_KEY="dev-secret-key-12345"

# Maak een data map voor de SQLite database (Persistent Volume)
RUN mkdir -p /data

# Expose de poort
EXPOSE 3000

# Start de backend (die ook de frontend serveert)
CMD ["sh", "-c", "cd backend && npx prisma db push && npm start"]
