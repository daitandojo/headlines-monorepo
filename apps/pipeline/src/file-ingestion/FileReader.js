// apps/pipeline/src/file-ingestion/FileReader.js
// Reads and normalises files in various formats
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class FileReader {
  static async readBuffer(buffer, fileName) {
    const ext = path.extname(fileName || '').toLowerCase().slice(1) || 'txt'
    const format = this.detectFormat(ext, fileName || '')
    const size = buffer.byteLength

    if (size === 0) {
      throw new Error('File is empty')
    }

    let rawContent
    let detectedEncoding = 'UTF-8'

    try {
      const decoder = new TextDecoder('utf8')
      rawContent = decoder.decode(buffer)
    } catch (e) {
      try {
        const decoder = new TextDecoder('latin1')
        rawContent = decoder.decode(buffer)
        detectedEncoding = 'LATIN-1'
      } catch (e2) {
        throw new Error(`Could not decode file: ${e2.message}`)
      }
    }

    const normalisedContent = this.normalise(rawContent, format)
    const lineCount = normalisedContent.split('\n').filter(l => l.trim()).length

    return {
      rawContent: normalisedContent,
      format,
      fileSizeBytes: size,
      lineCount,
      detectedEncoding,
      originalFileName: fileName,
    }
  }

  static async read(filePath) {
    // Check file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }

    const stats = fs.statSync(filePath)
    if (stats.size === 0) {
      throw new Error('File is empty')
    }

    if (stats.size > 500 * 1024) {
      console.warn(`  WARNING: File is ${Math.round(stats.size / 1024)}KB, may be slow to process`)
    }

    const ext = path.extname(filePath).toLowerCase().slice(1) || 'txt'
    const format = this.detectFormat(ext, filePath)

    // Detect encoding
    let rawContent
    let detectedEncoding = 'UTF-8'

    try {
      rawContent = fs.readFileSync(filePath, 'utf8')
    } catch (e) {
      // Try Latin-1 (common for Scandinavian exports)
      try {
        rawContent = fs.readFileSync(filePath, 'latin1')
        detectedEncoding = 'LATIN-1'
      } catch (e2) {
        throw new Error(`Could not read file with any encoding: ${e2.message}`)
      }
    }

    // Normalise based on format
    const normalisedContent = this.normalise(rawContent, format)

    const lineCount = normalisedContent.split('\n').filter(l => l.trim()).length

    return {
      rawContent: normalisedContent,
      format,
      fileSizeBytes: stats.size,
      lineCount,
      detectedEncoding,
      originalFileName: path.basename(filePath),
    }
  }

  static detectFormat(ext, filePath) {
    const formatMap = {
      txt: 'txt',
      md: 'md',
      json: 'json',
      csv: 'csv',
      html: 'html',
      htm: 'html',
      xml: 'html',
      pdf: 'pdf',
    }

    const format = formatMap[ext]

    if (!format) {
      // Try to detect from content
      const content = fs.readFileSync(filePath, 'utf8').slice(0, 200)
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        return 'json'
      }
      if (content.includes('<!DOCTYPE html') || content.includes('<html')) {
        return 'html'
      }
      if (content.includes(',') && content.split('\n')[0].includes(',')) {
        return 'csv'
      }
      return 'txt'
    }

    return format
  }

  static normalise(content, format) {
    switch (format) {
      case 'md':
        return this.stripMarkdown(content)
      case 'html':
        return this.stripHtml(content)
      case 'csv':
        return this.normaliseCsv(content)
      case 'json':
        return this.extractJsonText(content)
      default:
        return content
    }
  }

  static stripMarkdown(content) {
    // Basic markdown stripping
    return content
      .replace(/^#{1,6}\s+/gm, '') // Headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
      .replace(/\*([^*]+)\*/g, '$1') // Italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      .replace(/^[-*+]\s+/gm, '') // List items
      .replace(/^\d+\.\s+/gm, '') // Numbered list
      .trim()
  }

  static stripHtml(content) {
    // Simple HTML stripping - in production would use cheerio or similar
    return content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim()
  }

  static normaliseCsv(content) {
    // For CSV, we'll keep structure but normalize whitespace
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim()
  }

  static extractJsonText(content) {
    try {
      const parsed = JSON.parse(content)
      // If it's an array of objects, stringify for extraction
      if (Array.isArray(parsed)) {
        return parsed.map(item => JSON.stringify(item)).join('\n')
      }
      // If it's an object, return as text
      return JSON.stringify(parsed, null, 2)
    } catch (e) {
      // Not valid JSON, return as-is
      return content
    }
  }
}