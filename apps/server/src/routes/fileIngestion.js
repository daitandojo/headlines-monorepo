// apps/server/src/routes/fileIngestion.js
import { Router } from 'express'
import multer from 'multer'
import { verifyAdmin } from '../middleware/auth.js'
import { logger } from '@headlines/utils-shared'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { z } from 'zod'

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

const ingestionSchema = z.object({
  dryRun: z.enum(['true', 'false']).optional(),
  force: z.enum(['true', 'false']).optional(),
  limit: z.string().optional(),
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

  const parsed = ingestionSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' })
  }

  const options = {
    dryRun: parsed.data.dryRun === 'true',
    force: parsed.data.force === 'true',
    limit: parsed.data.limit ? parseInt(parsed.data.limit, 10) : null,
    verbose: true,
  }

  const tmpDir = os.tmpdir()
  const tmpPath = path.join(tmpDir, `ww-ingest-${Date.now()}-${req.file.originalname}`)

  try {
    fs.writeFileSync(tmpPath, req.file.buffer)
    logger.info(`File ingestion started: ${req.file.originalname} (${req.file.size} bytes)`)

    await runPipelineCli(tmpPath, options)

    logger.info('File ingestion completed via HTTP API')
    return res.status(200).json({
      success: true,
      runId: `http-${Date.now()}`,
      fileName: req.file.originalname,
      classification: { classification: 'file_ingested', confidence: 'completed' },
      extraction: { totalExtracted: null, extractionErrors: 0 },
      deduplication: { alreadyExisting: null, newToEnrich: null },
      summary: { newOpportunitiesCreated: null, alreadyExisting: null, excluded: null },
    })
  } catch (error) {
    logger.error(`File ingestion failed: ${error.message?.substring(0, 100) || ''}`)
    return res.status(500).json({ error: 'File ingestion failed.', code: 'INGESTION_ERROR' })
  }
})

export { router as fileIngestionRoute }