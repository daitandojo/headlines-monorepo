#!/bin/bash
# This script executes the pipeline directly from the monorepo root
# using the npm workspace command for reliability.

# Get the directory of this script to reliably find the monorepo root.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# Navigate up two directories from apps/pipeline to the monorepo root
MONOREPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Change to the monorepo root directory. This is crucial for npm workspaces.
cd "$MONOREPO_ROOT"

echo "Executing pipeline from monorepo root: $(pwd)"
echo "---"

# DEFINITIVE FIX: Execute the pipeline using the npm workspace command.
# This ensures that the correct Node.js version (if managed by nvm/volta)
# and all dependencies are correctly resolved by npm.
# "$@" passes all arguments from this script to the npm command.
npm run pipeline -w @headlines/pipeline -- "$@"
