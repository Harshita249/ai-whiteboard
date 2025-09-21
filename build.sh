#!/bin/sh
set -e

# Install backend dependencies
pip install -r requirements.txt

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Copy build into backend static
mkdir -p backend/app/static
cp -r frontend/dist/* backend/app/static/
