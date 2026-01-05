#!/bin/bash

# Configuratie - PAS DEZE AAN VOOR RAILWAY
URL="https://JOUW-APP-NAAM.up.railway.app/api/location"
KEY="dev-secret-key-12345"

ID=${1:-"drone-01"}
LAT=${2:-"53.2284"}
LNG=${3:-"6.5416"}

echo "🚀 Sending location for $ID to $URL..."

curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $KEY" \
  -d "{
    \"trackerId\": \"$ID\",
    \"latitude\": $LAT,
    \"longitude\": $LNG,
    \"altitude\": 25,
    \"heading\": 0,
    \"status\": \"moving\"
  }"

echo -e "\n✅ Klaar!"
