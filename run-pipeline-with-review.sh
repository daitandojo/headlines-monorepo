#!/bin/bash
# run-pipeline-with-review.sh
# Runs the pipeline, captures output, then triggers the review agent
set -e

cd /mnt/samsung/home/Repos/projects/headlines-monorepo

# Clear previous run log
rm -f apps/pipeline/logs/run.log

# Run the pipeline and capture output
echo "[RUNNER] Starting pipeline at $(date)"
pnpm pipeline 2>&1 | tee /tmp/pipeline_cron_output.log
EXIT_CODE=$?
echo "[RUNNER] Pipeline finished with exit code $EXIT_CODE at $(date)"

# Signal completion for the review phase
echo "PIPELINE_EXIT_CODE=$EXIT_CODE" > /tmp/pipeline_cron_status.txt
echo "RUN_COMPLETED_AT=$(date -Iseconds)" >> /tmp/pipeline_cron_status.txt

exit $EXIT_CODE
