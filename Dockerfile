# ============================
# Stage 1 - Build Angular App
# ============================
FROM node:20 as build

WORKDIR /app

# Install frontend dependencies
COPY frontend/package.json frontend/yarn.lock ./frontend/
RUN cd frontend && yarn install

# Build frontend
COPY frontend ./frontend
RUN cd frontend && yarn build --configuration production

# ============================
# Stage 2 - Backend + Serve Angular
# ============================
FROM node:20

WORKDIR /app

# Install backend dependencies
COPY backend/package.json backend/yarn.lock ./backend/
RUN cd backend && yarn install

# Copy backend code
COPY backend ./backend

# Copy Angular build output
COPY --from=build /app/frontend/dist ./backend/public

EXPOSE 3000

CMD ["node", "backend/index.js"]
