#!/bin/bash
# This is the definitive, robust runner script for all pipeline tasks.
# It is designed to be called from the monorepo root (e.g., via `pnpm --filter`).
# It correctly sets up the environment and executes the target script with all arguments.

# Get the directory of this script to reliably find the monorepo root.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
MONOREPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# The first argument ($1) is the target script path or special command.
TARGET_SCRIPT_RELATIVE=$1

# Remove the first argument from the list of arguments.
shift

# This loop consumes all leading "--" arguments passed by pnpm or the package.json script.
# It ensures that only the user-provided flags are passed to the Node.js script.
while [[ "$1" == "--" ]]; do
  shift
done

# Immediately change to the monorepo root. This is critical for dotenv and node module resolution.
cd "$MONOREPO_ROOT"

# Set the environment variable that all scripts check for.
export IS_PIPELINE_RUN=true

# Check for the special 'test:upserter' command
if [[ "$TARGET_SCRIPT_RELATIVE" == "test:upserter" ]]; then
  echo "Executing special test command: test:upserter with mocking"
  echo "With arguments: $@"
  echo "---"
  # Construct the specific command for this test, including the loader
  COMMAND="node --loader ./apps/pipeline/scripts/test-pipeline/mock-loader.js ./apps/pipeline/scripts/test-pipeline/test-opportunity-upserter.js $@"
else
  # This is the default behavior for all other scripts
  TARGET_SCRIPT_FULL="apps/pipeline/${TARGET_SCRIPT_RELATIVE}"
  echo "Executing script: ${TARGET_SCRIPT_FULL}"
  echo "With arguments: $@"
  echo "---"
  COMMAND="node $TARGET_SCRIPT_FULL $@"
fi

# Use dotenv-cli to load the .env file from the root, then execute the constructed command
pnpm exec dotenv -e ./.env -- $COMMAND