// apps/pipeline/src/file-ingestion/RunLogger.js
// Structured logging for file ingestion runs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class RunLogger {
  constructor(sourceFile, options) {
    this.runId = this.generateId()
    this.sourceFile = sourceFile
    this.options = options
    this.startTime = new Date()
    
    // Create logs directory
    this.logsDir = path.join(process.cwd(), 'apps', 'pipeline', 'logs', 'file-ingestion')
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true })
    }

    this.logData = {
      runId: this.runId,
      timestamp: this.startTime.toISOString(),
      sourceFile,
      options,
      classification: null,
      extraction: null,
      deduplication: null,
      enrichment: null,
      errors: [],
    }
  }

  generateId() {
    return 'run_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8)
  }

  logFileRead(fileData) {
    this.logData.fileRead = {
      format: fileData.format,
      fileSizeBytes: fileData.fileSizeBytes,
      lineCount: fileData.lineCount,
      detectedEncoding: fileData.detectedEncoding,
    }
  }

  logClassification(classification) {
    this.logData.classification = classification
  }

  logExtraction(extraction) {
    this.logData.extraction = {
      totalExtracted: extraction.individuals.length,
      extractionErrors: extraction.errors.length,
      individuals: extraction.individuals,
    }
  }

  logDeduplication(result) {
    this.logData.deduplication = {
      alreadyExisting: result.alreadyExisting.length,
      newToEnrich: result.toEnrich.length,
      existingRecords: result.alreadyExisting,
    }
  }

  logEnrichment(results) {
    this.logData.enrichment = {
      attempted: results.succeeded.length + results.failed.length,
      succeeded: results.succeeded.length,
      failed: results.failed.length,
      excluded: results.excluded.length,
      results: results.succeeded,
      failures: results.failed,
    }
  }

  logError(error) {
    this.logData.errors.push({
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
    })
  }

  logExclusion(name, reason) {
    this.logData.exclusions = this.logData.exclusions || []
    this.logData.exclusions.push({
      name,
      reason,
      timestamp: new Date().toISOString(),
    })
  }

  async writeLogs(enrichmentResults, alreadyExisting) {
    const duration = Math.round((new Date() - this.startTime) / 1000)
    this.logData.summary = {
      totalProcessed: (enrichmentResults.succeeded?.length || 0) + (enrichmentResults.failed?.length || 0) + (alreadyExisting?.length || 0) + (enrichmentResults.excluded?.length || 0),
      newOpportunitiesCreated: enrichmentResults.succeeded?.length || 0,
      existingRecordsUpdated: 0,
      excluded: enrichmentResults.excluded?.length || 0,
      requiresReview: 0,
      errors: enrichmentResults.failed?.length || 0,
      runDurationSeconds: duration,
    }

    // Write JSON log
    const jsonPath = path.join(this.logsDir, `${this.runId}_${path.basename(this.sourceFile)}.json`)
    fs.writeFileSync(jsonPath, JSON.stringify(this.logData, null, 2))
    this.jsonPath = jsonPath

    // Write human-readable summary
    const txtPath = path.join(this.logsDir, `${this.runId}_${path.basename(this.sourceFile)}.txt`)
    const txtContent = this.generateHumanReadable(enrichmentResults, alreadyExisting, duration)
    fs.writeFileSync(txtPath, txtContent)
    this.txtPath = txtPath
  }

  generateHumanReadable(enrichmentResults, alreadyExisting, duration) {
    const summary = this.logData.summary
    const classification = this.logData.classification

    let txt = `FILE INGESTION RUN REPORT
${'='.repeat(50)}
Run ID:        ${this.runId}
Timestamp:     ${this.startTime.toISOString()}
Source file:   ${this.sourceFile}
Classification: ${classification?.classification || 'N/A'} (${classification?.confidence || 'N/A'} confidence)

EXTRACTION
  Individuals found:     ${this.logData.extraction?.totalExtracted || 0}
  Extraction errors:      ${this.logData.extraction?.extractionErrors || 0}

DEDUPLICATION
  Already in database:   ${alreadyExisting?.length || 0}
  New to enrich:         ${summary.newOpportunitiesCreated || 0}

ENRICHMENT RESULTS
  Created:              ${summary.newOpportunitiesCreated || 0}
  Already in database:   ${alreadyExisting?.length || 0}
  Excluded:             ${summary.excluded || 0}
  Failures:             ${summary.errors || 0}

Run completed in ${duration}s
`
    return txt
  }

  getRunSummary(enrichmentResults, alreadyExisting) {
    return {
      runId: this.runId,
      sourceFile: this.sourceFile,
      startTime: this.startTime,
      newOpportunities: enrichmentResults.succeeded?.length || 0,
      existingRecords: alreadyExisting?.length || 0,
      excluded: enrichmentResults.excluded?.length || 0,
      errors: enrichmentResults.failed?.length || 0,
      jsonLogPath: this.jsonPath,
    }
  }

  getLogPath() {
    return this.jsonPath
  }
}