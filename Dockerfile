# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma Client and build
RUN yarn prisma:generate
RUN yarn build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./

# Install production dependencies only
RUN yarn install --production --frozen-lockfile

# Copy prisma schema for runtime
COPY prisma ./prisma

# Generate Prisma Client
RUN yarn prisma:generate

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "dist/server/index.js"]
