// apps/server/src/routes/fileIngestion.js
import { Router } from 'express'
import multer from 'multer'
import { verifyAdmin } from '../middleware/auth.js'
import { logger } from '@headlines/utils-shared'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'

const router = Router()
router.use(verifyAdmin)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.txt', '.csv', '.json', '.md']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error(`Unsupported file type. Allowed: ${allowed.join(', ')}`))
    }
  },
})

function runPipelineCli(filePath, options) {
  return new Promise((resolve, reject) => {
    const args = ['src/file-ingestion/index.js', '--file', filePath]
    if (options.verbose) args.push('--verbose')
    if (options.dryRun) args.push('--dry-run')
    if (options.force) args.push('--force')
    if (options.limit) {
      args.push('--limit', String(options.limit))
    }

    const pipelineScript = path.resolve(process.cwd(), 'apps/pipeline/src/file-ingestion/index.js')
    const proc = spawn('node', args, {
      cwd: path.resolve(process.cwd(), 'apps/pipeline'),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      const text = data.toString()
      stdout += text
      logger.info(text.trim())
    })
    proc.stderr.on('data', (data) => {
      const text = data.toString()
      stderr += text
    })

    proc.on('close', (code) => {
      fs.unlink(filePath, () => {})
      if (code === 0) {
        resolve({ stdout, code })
      } else {
        logger.error({ stderr, code }, 'Pipeline CLI exited with error')
        reject(new Error(stderr || `Pipeline exited with code ${code}`))
      }
    })

    proc.on('error', (err) => {
      fs.unlink(filePath, () => {})
      reject(err)
    })
  })
}

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' })
  }

  const options = {
    dryRun: req.body.dryRun === 'true',
    force: req.body.force === 'true',
    limit: req.body.limit ? parseInt(req.body.limit, 10) : null,
    verbose: true,
  }

  const tmpDir = os.tmpdir()
  const tmpPath = path.join(tmpDir, `ww-ingest-${Date.now()}-${req.file.originalname}`)

  try {
    fs.writeFileSync(tmpPath, req.file.buffer)
    logger.info({ file: req.file.originalname, size: req.file.size, options }, 'File ingestion started')

    await runPipelineCli(tmpPath, options)

    const classification = {
      classification: 'file_ingested',
      confidence: 'completed',
      detectedLanguage: null,
      estimatedRecordCount: null,
    }
    const summary = { newOpportunitiesCreated: null, alreadyExisting: null, excluded: null }

    logger.info({ file: req.file.originalname }, 'File ingestion completed via HTTP API')
    return res.status(200).json({
      success: true,
      runId: `http-${Date.now()}`,
      fileName: req.file.originalname,
      classification,
      extraction: { totalExtracted: null, extractionErrors: 0 },
      deduplication: { alreadyExisting: null, newToEnrich: null },
      summary,
    })
  } catch (error) {
    logger.error({ err: error, file: req.file.originalname }, 'File ingestion HTTP API error')
    return res.status(500).json({ error: error.message })
  }
})

export { router as fileIngestionRoute }