# -------------------------------
# Stage 1 — Build Angular Frontend
# -------------------------------
FROM node:20 AS frontend-build

WORKDIR /app/frontend

# Install frontend dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy full frontend source
COPY frontend/ .

# Build production Angular app
RUN npm run build --configuration production


# -------------------------------
# Stage 2 — Build Backend
# -------------------------------
FROM node:20 AS backend-build

WORKDIR /app/backend

# Install backend dependencies
COPY backend/package*.json ./
RUN npm install

# Copy backend code
COPY backend/ .

# Copy built Angular files into backend "public" folder
COPY --from=frontend-build /app/frontend/dist /app/backend/public


# -------------------------------
# Stage 3 — Final Runtime Image
# -------------------------------
FROM node:20

WORKDIR /app

# Copy backend app
COPY --from=backend-build /app/backend .

# Set production environment
ENV NODE_ENV=production

# Expose backend port
EXPOSE 3000

# Start backend API
CMD ["node", "index.js"]
