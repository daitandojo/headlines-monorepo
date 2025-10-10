#!/bin/bash
# mongo-backup.sh (version 6.0 - Dynamic Collection Discovery)
# This script discovers and dumps ALL collections from the database to a timestamped directory.

# --- Find the monorepo root in a completely robust way ---
# Start from the script's own directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Traverse up the directory tree until we find the 'pnpm-workspace.yaml' file
while [[ "$DIR" != "/" ]]; do
    if [ -f "$DIR/pnpm-workspace.yaml" ]; then
        MONOREPO_ROOT="$DIR"
        break
    fi
    DIR=$(dirname "$DIR")
done

if [ -z "$MONOREPO_ROOT" ]; then
    echo "❌ Critical Error: Could not find the monorepo root by searching for 'pnpm-workspace.yaml'."
    exit 1
fi

# --- Configuration using absolute paths ---
BACKUP_DIR="$MONOREPO_ROOT/apps/pipeline/backup"
TIMESTAMP=$(date +"%Y-%m-%dT%H-%M-%S")
TARGET_DIR="$BACKUP_DIR/$TIMESTAMP"
ENV_FILE="$MONOREPO_ROOT/.env"

# --- Pre-flight Checks ---
if ! command -v mongosh &> /dev/null; then
    echo "❌ Error: 'mongosh' command-line tool not found. Please install MongoDB Shell."
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env file not found in the monorepo root."
    echo "   - Script's calculated root path: $MONOREPO_ROOT"
    echo "   - Script was expecting .env at: $ENV_FILE"
    exit 1
fi

# Robustly export variables from the .env file
set -a 
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

# --- Dynamically discover all collections ---
echo "Discovering all collections in the database..."
# Use mongosh to execute a command that returns a space-separated list of collection names.
COLLECTIONS=$(mongosh "$MONGO_URI" --quiet --eval "db.getCollectionNames().join(' ')")

if [ $? -ne 0 ] || [ -z "$COLLECTIONS" ]; then
    echo "❌ Error: Failed to fetch collection names from the database."
    exit 1
fi

echo "Found collections: $COLLECTIONS"
echo ""

for collection in $COLLECTIONS; do
    # Ignore the system collection
    if [ "$collection" == "system.views" ]; then
        continue
    fi

    echo "  -> Backing up collection: $collection..."
    mongodump --uri="$MONGO_URI" --collection="$collection" --out="$TARGET_DIR" --gzip
    if [ $? -ne 0 ]; then
        echo "❌ Error backing up collection $collection. Aborting."
        exit 1
    fi
done

echo "✅ Backup complete. All discovered collections saved to $TARGET_DIR"
exit 0