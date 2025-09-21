#!/bin/bash
set -e

# Build frontend
cd frontend
npm install
npm run build

# Copy build to backend static
cd ..
mkdir -p backend/app/static
cp -r frontend/dist/* backend/app/static/
