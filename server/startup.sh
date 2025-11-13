#!/bin/sh
# Exit immediately if a command exits with a non-zero status.
set -e

# Run database migrations
# We use node to run the compiled JS file from the dist/ directory
node dist/scripts/migrate.js

# Start the main application
node dist/index.js
