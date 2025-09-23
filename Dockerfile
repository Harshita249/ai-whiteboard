# Base image with Python 3.11 and Debian bookworm for stable security patches
FROM python:3.11


# Install Node 18 and build tools
RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y curl gnupg build-essential ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy frontend and build
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm ci --silent
# Install vite globally to avoid path issues
RUN npm install -g vite
RUN vite build

# Copy backend and move frontend build into backend/dist
WORKDIR /app
COPY backend ./backend
RUN rm -rf backend/dist || true
RUN cp -r frontend/dist backend/dist

# Set working dir to backend and expose port
WORKDIR /app/backend
EXPOSE 8000

# Use Railway's injected $PORT via exec form
CMD exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
