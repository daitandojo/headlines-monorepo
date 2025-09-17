#!/bin/bash
# mongo-restore.sh (version 1.0)
# This script restores all collections from a specified backup directory.

# --- Configuration ---
BACKUP_DIR="apps/pipeline/backup"

# Load MONGO_URI from the root .env file
if [ -f "./.env" ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "❌ Error: .env file not found in the monorepo root."
    exit 1
fi

if [ -z "$MONGO_URI" ]; then
    echo "❌ Error: MONGO_URI is not set in your .env file."
    exit 1
fi

# --- Main Logic ---
echo "🚀 Starting MongoDB restore..."

# Find the latest backup directory if none is specified
if [ -z "$1" ]; then
    LATEST_BACKUP=$(ls -td $BACKUP_DIR/*/ | head -1)
    if [ -z "$LATEST_BACKUP" ]; then
        echo "❌ No backup directories found in $BACKUP_DIR."
        exit 1
    fi
    echo "No directory specified. Using latest backup: $LATEST_BACKUP"
    SOURCE_DIR=$LATEST_BACKUP
else
    SOURCE_DIR="$BACKUP_DIR/$1"
fi

if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Backup directory not found: $SOURCE_DIR"
    exit 1
fi

echo "⚠️ This will overwrite data in the target database."
read -p "Are you sure you want to restore from $SOURCE_DIR? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled by user."
    exit 1
fi

echo "Restoring from $SOURCE_DIR..."
# Use --drop to ensure a clean restore of each collection
mongorestore --uri="$MONGO_URI" --dir="$SOURCE_DIR" --drop --gzip

if [ $? -eq 0 ]; then
    echo "✅ Restore complete."
else
    echo "❌ An error occurred during the restore process."
    exit 1
fi
exit 0
