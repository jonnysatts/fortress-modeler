#
# === BUILD STAGE ===
#
FROM --platform=linux/amd64 node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package*.json ./
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Copy non-TS assets that are not handled by the compiler
COPY src/db/schema.sql /app/dist/db/

#
# === PRODUCTION STAGE ===
#
FROM --platform=linux/amd64 node:18-alpine

# Set working directory
WORKDIR /app

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package.json and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the built application from the build stage
COPY --from=build /app/dist ./dist

# Copy the startup script
COPY startup.sh ./
RUN chmod +x ./startup.sh

# Change ownership of the app directory to the non-root user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose the application port
EXPOSE 8080

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Set the entrypoint to the startup script
ENTRYPOINT ["./startup.sh"]