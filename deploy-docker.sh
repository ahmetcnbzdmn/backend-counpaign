#!/bin/bash

# ===== Docker-based Deploy to AWS EC2 =====
# Replaces the old rsync + pm2 approach with Docker Compose

KEY_PATH="/Users/bahribirer/Desktop/counpaign-backend/counpaign-key.pem"
SOURCE_PATH="/Users/bahribirer/Desktop/counpaign-backend/backend-counpaign"
SERVER_IP="16.16.255.118"
REMOTE_USER="ubuntu"
REMOTE_DIR="~/backend-counpaign"

echo "🚀 Docker Deploy to AWS EC2..."

# 1. Sync project files (excludes heavy/sensitive stuff)
echo "📦 Syncing project files..."
rsync -avz -e "ssh -o StrictHostKeyChecking=no -i $KEY_PATH" \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '*.pem' \
    --exclude '*.log' \
    --exclude '.DS_Store' \
    --exclude 'uploads/' \
    --exclude 'mongo_dump/' \
    --exclude 'counpaign_local_backup/' \
    --exclude 'data/' \
    $SOURCE_PATH/ $REMOTE_USER@$SERVER_IP:$REMOTE_DIR/

# 2. Copy .env separately (rsync excludes it by default in .gitignore context)
echo "🔑 Syncing .env..."
scp -o StrictHostKeyChecking=no -i $KEY_PATH \
    $SOURCE_PATH/.env $REMOTE_USER@$SERVER_IP:$REMOTE_DIR/.env

# 3. Copy Firebase service account key
echo "🔥 Syncing Firebase key..."
scp -o StrictHostKeyChecking=no -i $KEY_PATH \
    $SOURCE_PATH/serviceAccountKey.json $REMOTE_USER@$SERVER_IP:$REMOTE_DIR/serviceAccountKey.json

# 4. Stop old containers, kill port 5000, Build & Restart
echo "🛑 Stopping old containers and freeing port 5000..."
ssh -o StrictHostKeyChecking=no -i $KEY_PATH $REMOTE_USER@$SERVER_IP "
    cd $REMOTE_DIR && \
    docker compose down 2>/dev/null; \
    sudo kill \$(sudo lsof -ti:5000) 2>/dev/null; \
    sleep 2 && \
    echo '🧹 Cleaning old Docker images...' && \
    docker image prune -af 2>/dev/null; \
    echo '🐳 Building Docker image...' && \
    docker compose build --no-cache && \
    echo '🚀 Starting containers...' && \
    docker compose up -d && \
    echo '' && \
    echo '📊 Container Status:' && \
    docker compose ps && \
    echo '' && \
    echo '⏳ Waiting for health check (30s)...' && \
    sleep 30 && \
    echo '🩺 Health Check:' && \
    curl -sf http://localhost:5000/ | head -c 200 || echo 'Health check pending...' && \
    echo '' && \
    echo '📋 Backend Logs (last 10):' && \
    docker compose logs backend --tail 10
"

echo ""
echo "✅ Docker Deploy Complete!"
echo "   Backend: http://$SERVER_IP"
echo "   Health:  http://$SERVER_IP:5000/"
