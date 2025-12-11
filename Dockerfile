##############################################
# Stage 1 — Build Angular Frontend
##############################################
FROM node:20 AS frontend-build

WORKDIR /app/frontend

# Copy package JSON
COPY frontend/package*.json ./

# Install dependencies (fix Angular 20 peer conflicts)
RUN npm install --legacy-peer-deps

# Copy full Angular source
COPY frontend/ .

# Build Angular project (YOUR PROJECT NAME)
RUN npx ng build auth-angular17j --configuration production


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

# Copy Angular dist → backend/public
COPY --from=frontend-build /app/frontend/dist/auth-angular17j /app/backend/public


##############################################
# Stage 3 — Final Runtime Image
##############################################
FROM node:20

WORKDIR /app

# Copy backend build
COPY --from=backend-build /app/backend .

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "index.js"]
