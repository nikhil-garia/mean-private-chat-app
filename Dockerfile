# ============================
# Stage 1 - Build Angular App
# ============================
FROM node:20 as build

WORKDIR /app

# Install Angular dependencies
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --legacy-peer-deps

# Build Angular
COPY frontend ./frontend
RUN cd frontend && npm run build --prod


# ============================
# Stage 2 - Backend + Serve Angular
# ============================
FROM node:20

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy backend source
COPY backend ./backend

# Copy Angular dist folder into backend/public
COPY --from=build /app/frontend/dist/nextalk/browser ./backend/public


EXPOSE 8080

CMD ["node", "backend/index.js"]
