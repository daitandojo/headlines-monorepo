#!/bin/bash
# This is the definitive, robust runner script for all pipeline tasks.
# It is designed to be called from the monorepo root (e.g., via `pnpm --filter`).
# It correctly sets up the environment and executes the target script with all arguments.

# Get the directory of this script to reliably find the monorepo root.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
MONOREPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# The first argument ($1) is the target script path, relative to the pipeline app's root.
# Example: "src/app.js"
TARGET_SCRIPT_RELATIVE=$1

# The full, unambiguous path to the target script from the monorepo root.
# Example: "apps/pipeline/src/app.js"
TARGET_SCRIPT_FULL="apps/pipeline/${TARGET_SCRIPT_RELATIVE}"

# Remove the first argument (the script path) from the list of arguments.
shift

# --- START OF THE FIX ---
# This loop consumes all leading "--" arguments passed by pnpm or the package.json script.
# It ensures that only the user-provided flags are passed to the Node.js script.
while [[ "$1" == "--" ]]; do
  shift
done
# --- END OF THE FIX ---

# Immediately change to the monorepo root. This is critical for dotenv and node module resolution.
cd "$MONOREPO_ROOT"

echo "Executing script: ${TARGET_SCRIPT_FULL}"
echo "With arguments: $@"
echo "---"

# Set the environment variable that all scripts check for.
export IS_PIPELINE_RUN=true

# Use dotenv-cli to load the .env file from the root, then execute the target script
# with its full path, passing along all remaining arguments.
pnpm exec dotenv -e ./.env -- node "$TARGET_SCRIPT_FULL" "$@"