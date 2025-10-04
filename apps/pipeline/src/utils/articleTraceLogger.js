// apps/pipeline/src/utils/articleTraceLogger.js (NEW FILE)
import fs from 'fs/promises'
import path from 'path'
import { EOL } from 'os'
import { format } from 'util'
import { logger } from '@headlines/utils-shared'

// A simple utility to sanitize filenames
function sanitizeFilename(name) {
  if (!name || typeof name !== 'string') {
    return `invalid_filename_${Date.now()}`
  }
  return name.replace(/[^a-z0-9_.-]/gi, '_').substring(0, 150)
}

export class ArticleTraceLogger {
  constructor() {
    this.runId = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '')
    this.baseDir = path.resolve(process.cwd(), 'apps/pipeline/logs/articles', this.runId)
    this.traces = new Map()
    this.initialized = false
  }

  async initialize() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true })
      this.initialized = true
    } catch (error) {
      logger.error({ err: error }, 'Failed to create article trace log directory.')
    }
  }

  startTrace(article) {
    if (!this.initialized || !article?._id) return
    const trace = {
      _id: article._id.toString(),
      headline: article.headline,
      link: article.link,
      source: article.newspaper,
      stages: [],
    }
    this.traces.set(article._id.toString(), trace)
  }

  addStage(articleId, stageName, data) {
    if (!this.initialized) return
    const id = typeof articleId === 'string' ? articleId : articleId?.toString()
    if (!id) return
    const trace = this.traces.get(id)
    if (trace) {
      trace.stages.push({ name: stageName, data, timestamp: new Date() })
    }
  }

  async writeAllTraces() {
    if (!this.initialized) return

    for (const [articleId, trace] of this.traces.entries()) {
      let content = `ARTICLE TRACE: ${trace.headline}${EOL}`
      content += `Source: ${trace.source}${EOL}`
      content += `Link: ${trace.link}${EOL}`
      content += `============================================================${EOL}${EOL}`

      trace.stages.forEach((stage) => {
        content += `--- STAGE: ${stage.name.toUpperCase()} (${stage.timestamp.toISOString()}) ---${EOL}`
        content += `${format(stage.data, { depth: null })}${EOL}${EOL}`
      })

      const filename = sanitizeFilename(`${trace.headline}.log`)
      const filePath = path.join(this.baseDir, filename)
      try {
        await fs.writeFile(filePath, content)
      } catch (error) {
        logger.error(
          { err: error, file: filePath },
          'Failed to write article trace file.'
        )
      }
    }
    logger.info(
      `Wrote ${this.traces.size} detailed article trace logs to: ${this.baseDir}`
    )
  }

  getAllTraces() {
    return Array.from(this.traces.values())
  }
}
