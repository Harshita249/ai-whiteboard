# Use Python 3.11 slim with security patches
FROM python:3.11-slim-bookworm

# Install Node.js for frontend build
RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y curl gnupg build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Backend dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Frontend build
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm install
RUN npm install -g vite
RUN vite build

# Copy backend and move frontend dist into it
WORKDIR /app
COPY backend ./backend
RUN cp -r frontend/dist backend/dist

# Set working dir for backend
WORKDIR /app/backend

# Expose port
EXPOSE 8000

# Start FastAPI with Railway's injected $PORT
CMD exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
