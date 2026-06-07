// apps/pipeline/src/utils/imageDownloader.js
import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'
import { logger } from '@headlines/utils-shared'

const CACHE_DIR = path.resolve(process.cwd(), 'cache/images')
const ARTICLE_DIR = path.join(CACHE_DIR, 'articles')
const PROFILE_DIR = path.join(CACHE_DIR, 'profiles')

async function ensureDirs() {
  await fs.mkdir(ARTICLE_DIR, { recursive: true })
  await fs.mkdir(PROFILE_DIR, { recursive: true })
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']

export async function downloadArticleImage(url, articleId, sourceName) {
  if (!url) return null
  try {
    await ensureDirs()
    const sanitized = sourceName?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown'
    const filename = `${sanitized}_${articleId}.webp`
    const outputPath = path.join(ARTICLE_DIR, filename)

    const exists = await fs.access(outputPath).then(() => true).catch(() => false)
    if (exists) return `/api/images/article/${filename}`

    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Headlines-ImageBot/1.0' },
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type')
    if (!contentType || !ACCEPTED_TYPES.some(t => contentType.includes(t))) return null

    const buffer = Buffer.from(await res.arrayBuffer())
    const webpBuffer = await sharp(buffer)
      .resize(640, 480, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
    await fs.writeFile(outputPath, webpBuffer)
    logger.info(`[ImageDownloader] Cached article image: ${filename}`)
    return `/api/images/article/${filename}`
  } catch (err) {
    if (err.name === 'TimeoutError' || err.code === 'ERR_FETCH_FAILED') return null
    logger.warn({ err: err.message }, `[ImageDownloader] Failed for article ${articleId}`)
    return null
  }
}

export async function downloadProfilePhoto(url, opportunityId) {
  if (!url) return null
  try {
    await ensureDirs()
    const filename = `profile_${opportunityId}.webp`
    const outputPath = path.join(PROFILE_DIR, filename)
    const exists = await fs.access(outputPath).then(() => true).catch(() => false)
    if (exists) return `/api/images/profile/${filename}`

    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Headlines-ImageBot/1.0' },
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type')
    if (!contentType || !ACCEPTED_TYPES.some(t => contentType.includes(t))) return null

    const buffer = Buffer.from(await res.arrayBuffer())
    const webpBuffer = await sharp(buffer)
      .resize(256, 256, { fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toBuffer()
    await fs.writeFile(outputPath, webpBuffer)
    logger.info(`[ImageDownloader] Cached profile photo: ${filename}`)
    return `/api/images/profile/${filename}`
  } catch (err) {
    if (err.name === 'TimeoutError' || err.code === 'ERR_FETCH_FAILED') return null
    logger.warn({ err: err.message }, `[ImageDownloader] Failed for profile ${opportunityId}`)
    return null
  }
}

export async function imagePathToAbsolute(relativePath) {
  if (!relativePath) return null
  const parts = relativePath.split('/')
  const type = parts[3]
  const filename = parts[4]
  const dir = type === 'article' ? ARTICLE_DIR : PROFILE_DIR
  const fullPath = path.join(dir, filename)
  try {
    await fs.access(fullPath)
    return fullPath
  } catch {
    return null
  }
}