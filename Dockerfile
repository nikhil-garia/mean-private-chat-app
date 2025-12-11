##############################################
# Stage 1 — Build Angular Frontend
##############################################
FROM node:20 AS frontend-build

# Set working directory
WORKDIR /app/frontend

# Copy only package.json files for caching
COPY frontend/package*.json ./

# Install dependencies with relaxed peer checks (fix for Angular 20)
RUN npm install --legacy-peer-deps

# Copy all frontend source
COPY frontend/ .

# Build Angular for production
RUN npm run build --configuration production


##############################################
# Stage 2 — Build Backend
##############################################
FROM node:20 AS backend-build

WORKDIR /app/backend

# Install backend dependencies first (better caching)
COPY backend/package*.json ./
RUN npm install --legacy-peer-deps

# Copy backend source code
COPY backend/ .

# Copy Angular production files to backend public folder
COPY --from=frontend-build /app/frontend/dist /app/backend/public


##############################################
# Stage 3 — Final Runtime Image
##############################################
FROM node:20

WORKDIR /app

# Copy backend build from previous stage
COPY --from=backend-build /app/backend .

# Env for production
ENV NODE_ENV=production

# Backend port
EXPOSE 3000

# Start backend server
CMD ["node", "index.js"]
