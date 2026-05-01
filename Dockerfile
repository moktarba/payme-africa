FROM node:20-alpine

WORKDIR /app

# Dépendances backend
COPY backend/package*.json ./
RUN npm install --omit=dev

# Code source backend
COPY backend/ .

# Migrations SQL (accessibles depuis src/utils/migrate.js)
COPY database/migrations/ ./database/migrations/

EXPOSE 4000

CMD ["node", "src/app.js"]
