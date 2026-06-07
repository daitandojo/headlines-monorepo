#!/bin/bash
# Pipeline scheduler script
# Runs the headlines pipeline every 4 hours

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/pipeline_cron.log"

# Create logs directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/logs"

echo "========================================" >> "$LOG_FILE"
echo "Pipeline Cron: Starting at $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Run the pipeline
cd "$SCRIPT_DIR" && pnpm pipeline 2>&1 | tee -a "$LOG_FILE"

EXIT_CODE=${PIPESTATUS[0]}
echo "Pipeline finished with exit code: $EXIT_CODE at $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

exit $EXIT_CODE