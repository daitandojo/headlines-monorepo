    
#!/bin/bash
# purge-external-collections.sh (version 1.0)
# This script identifies and deletes collections from the database that are NOT part of the monorepo's known schema.

# --- Find the monorepo root in a completely robust way ---
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
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

# --- Configuration and Pre-flight Checks ---
ENV_FILE="$MONOREPO_ROOT/.env"

if ! command -v mongosh &> /dev/null; then
    echo "❌ Error: 'mongosh' command-line tool not found. Please install MongoDB Shell."
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env file not found in the monorepo root."
    exit 1
fi

set -a 
source <(grep -v '^#' "$ENV_FILE" | sed -e '/^$/d' -e 's/\r$//')
set +a

if [ -z "$MONGO_URI" ]; then
    echo "❌ Error: MONGO_URI is not set or could not be read from your .env file."
    exit 1
fi

# --- Main Logic ---

# 1. Define the list of collections that are known and should NOT be deleted.
KNOWN_COLLECTIONS=(
    "articles" "countries" "opportunities" "push_subscriptions" 
    "run_verdicts" "settings" "sources" "source_suggestions" 
    "subscribers" "synthesized_events" "watchlist_entities" "watchlist_suggestions"
)

echo "🔎 Analyzing database for external collections..."
echo "Known monorepo collections that will be KEPT:"
printf " - %s\n" "${KNOWN_COLLECTIONS[@]}"
echo ""

# 2. Get all collections currently in the database.
ALL_COLLECTIONS=$(mongosh "$MONGO_URI" --quiet --eval "db.getCollectionNames().join(' ')")
if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to fetch collection names from the database."
    exit 1
fi

# 3. Calculate which collections to delete.
COLLECTIONS_TO_DELETE=()
for db_coll in $ALL_COLLECTIONS; do
    # Ignore internal system collections
    if [[ "$db_coll" == "system.views" ]]; then
        continue
    fi
    
    is_known=false
    for known_coll in "${KNOWN_COLLECTIONS[@]}"; do
        if [[ "$db_coll" == "$known_coll" ]]; then
            is_known=true
            break
        fi
    done

    if [ "$is_known" = false ]; then
        COLLECTIONS_TO_DELETE+=("$db_coll")
    fi
done

# 4. Present for Confirmation
if [ ${#COLLECTIONS_TO_DELETE[@]} -eq 0 ]; then
    echo "✅ No external collections found. Your database is clean."
    exit 0
fi

echo -e "\033[0;31m🚨 WARNING: DESTRUCTIVE ACTION 🚨\033[0m"
echo "The following ${#COLLECTIONS_TO_DELETE[@]} collection(s) were found in your database but are NOT part of the monorepo:"
printf " - \033[0;33m%s\033[0m\n" "${COLLECTIONS_TO_DELETE[@]}"
echo ""
echo "This action will permanently delete these collections and all their data."
echo -e "It is highly recommended to run the backup script first: \033[0;36m./apps/pipeline/scripts/mongo-backup.sh\033[0m"
echo ""

read -p "To confirm, please type 'DELETE' and press [Enter]: " confirmation

# 5. Execute Deletion
if [ "$confirmation" != "DELETE" ]; then
    echo "❌ Confirmation failed. Aborting operation."
    exit 1
fi

echo ""
echo "Confirmation received. Proceeding with deletion..."
for collection_to_delete in "${COLLECTIONS_TO_DELETE[@]}"; do
    echo "  -> Deleting collection: $collection_to_delete..."
    mongosh "$MONGO_URI" --quiet --eval "db.getCollection('$collection_to_delete').drop()"
    if [ $? -eq 0 ]; then
        echo -e "     \033[0;32m✅ Dropped successfully.\033[0m"
    else
        echo -e "     \033[0;31m❌ Failed to drop collection.\033[0m"
    fi
done

echo ""
echo "✅ Purge operation complete."

  