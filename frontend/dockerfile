# =========================
# Stage 1: Build the Vite app
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build production frontend
RUN npm run build


# =========================
# Stage 2: Serve with NGINX
# =========================
FROM nginx:stable-alpine

# Copy built frontend files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose nginx port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]