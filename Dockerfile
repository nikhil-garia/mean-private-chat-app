##############################################
# Stage 1 — Build Angular Frontend
##############################################
FROM node:20 AS frontend-build

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies (fix Angular 20 peer issues)
RUN npm install --legacy-peer-deps

# Copy all frontend source
COPY frontend/ .

# Build Angular (auto-selects project)
RUN npx ng build --configuration production


##############################################
# Stage 2 — Build Backend
##############################################
FROM node:20 AS backend-build

WORKDIR /app/backend

# Install backend dependencies
COPY backend/package*.json ./
RUN npm install --legacy-peer-deps

# Copy backend source
COPY backend/ .

# Copy ANY Angular build output (works for all Angular versions)
COPY --from=frontend-build /app/frontend/dist/. /app/backend/public/


##############################################
# Stage 3 — Final Runtime Image
##############################################
FROM node:20

WORKDIR /app

# Copy backend + frontend build
COPY --from=backend-build /app/backend .

# Production environment
ENV NODE_ENV=production

# Expose backend port (your backend runs on 8080)
EXPOSE 3000

# Start backend
CMD ["node", "index.js"]
