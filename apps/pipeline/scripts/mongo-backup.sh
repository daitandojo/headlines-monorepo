#!/bin/bash
# mongo-backup.sh (version 1.1 - Robust .env parsing)
# This script dumps all relevant collections to a timestamped directory.

# --- Configuration ---
BACKUP_DIR="apps/pipeline/backup"
TIMESTAMP=$(date +"%Y-%m-%dT%H-%M-%S")
TARGET_DIR="$BACKUP_DIR/$TIMESTAMP"
ENV_FILE="./.env"

# --- Pre-flight Checks & Robust .env Loading ---
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env file not found in the monorepo root."
    exit 1
fi

# CORRECTED: Robustly export variables line-by-line, skipping comments and empty lines.
set -a # Automatically export all variables
source <(grep -v '^#' "$ENV_FILE" | sed -e '/^$/d' -e 's/\r$//')
set +a

if [ -z "$MONGO_URI" ]; then
    echo "❌ Error: MONGO_URI is not set or could not be read from your .env file."
    exit 1
fi

# --- Main Logic ---
echo "🚀 Starting MongoDB backup..."
echo "Target directory: $TARGET_DIR"

mkdir -p "$TARGET_DIR"

# List of collections to back up
COLLECTIONS=(
    "articles"
    "countries"
    "opportunities"
    "push_subscriptions"
    "run_verdicts"
    "settings"
    "sources"
    "source_suggestions"
    "subscribers"
    "synthesized_events"
    "watchlist_entities"
    "watchlist_suggestions"
)

for collection in "${COLLECTIONS[@]}"; do
    echo "  -> Backing up collection: $collection..."
    mongodump --uri="$MONGO_URI" --collection="$collection" --out="$TARGET_DIR" --gzip
    if [ $? -ne 0 ]; then
        echo "❌ Error backing up collection $collection. Aborting."
        exit 1
    fi
done

echo "✅ Backup complete. All collections saved to $TARGET_DIR"
exit 0