# /backend/Dockerfile
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies first (for caching)
COPY package*.json ./
RUN npm ci

# Copy the rest of the code and build (assuming you use TypeScript)
COPY . .
RUN npm run build

# --- Runner Stage ---
FROM node:20-alpine

WORKDIR /app

# Only copy production modules and the built code
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

# We do NOT set an ENTRYPOINT or CMD here.
# We will define the start command in docker-compose!