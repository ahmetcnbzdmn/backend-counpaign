#!/bin/bash
# ===== MongoDB Atlas Backup Script =====
# Uses mongodump to create daily backups
# Keeps last 7 days, optionally uploads to S3
#
# Usage:
#   chmod +x scripts/backup-mongo.sh
#   ./scripts/backup-mongo.sh
#
# Cron (daily at 3 AM):
#   0 3 * * * /path/to/scripts/backup-mongo.sh >> /path/to/logs/backup.log 2>&1

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

BACKUP_DIR="$SCRIPT_DIR/../backups"
DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_PATH="$BACKUP_DIR/$DATE"
KEEP_DAYS=7

echo "===== MongoDB Backup: $DATE ====="

# Create backup directory
mkdir -p "$BACKUP_PATH"

# Run mongodump
echo "📦 Running mongodump..."
if command -v mongodump &> /dev/null; then
    mongodump --uri="$MONGO_URI" --out="$BACKUP_PATH"
else
    echo "⚠️  mongodump not found. Trying with Docker..."
    docker run --rm \
        -v "$BACKUP_PATH:/backup" \
        mongo:7 \
        mongodump --uri="$MONGO_URI" --out="/backup"
fi

# Check result
if [ $? -eq 0 ]; then
    echo "✅ Backup successful: $BACKUP_PATH"
    
    # Compress
    echo "🗜️  Compressing..."
    cd "$BACKUP_DIR"
    tar -czf "$DATE.tar.gz" "$DATE"
    rm -rf "$DATE"
    echo "   Created: $BACKUP_DIR/$DATE.tar.gz"
else
    echo "❌ Backup failed!"
    rm -rf "$BACKUP_PATH"
    exit 1
fi

# Cleanup old backups (keep last N days)
echo "🧹 Cleaning up backups older than $KEEP_DAYS days..."
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$KEEP_DAYS -delete
REMAINING=$(ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)
echo "   $REMAINING backups remaining"

# Optional: Upload to S3
# Uncomment and configure if you have AWS CLI set up
# echo "☁️  Uploading to S3..."
# aws s3 cp "$BACKUP_DIR/$DATE.tar.gz" s3://your-bucket/mongo-backups/$DATE.tar.gz
# echo "   Uploaded to S3"

echo "===== Backup Complete ====="
