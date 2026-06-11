// apps/client/src/app/api/images/[type]/[id]/route.js
import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const CACHE_DIR = path.resolve(process.cwd(), '..', '..', 'apps/pipeline/cache/images')

const MIME_TYPES = {
  article: 'image/webp',
  profile: 'image/webp',
}

export async function GET(request, { params }) {
  const { type, id } = params
  if (!['article', 'profile'].includes(type)) {
    return NextResponse.json({ error: 'Invalid image type' }, { status: 400 })
  }

  const filename = id.includes('.webp') ? id : `${id}.webp`
  const filePath = path.join(CACHE_DIR, `${type}s`, filename)

  try {
    await fs.access(filePath)
    const buffer = await fs.readFile(filePath)
    const mime = MIME_TYPES[type] || 'image/webp'
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch {
    // Return a simple SVG placeholder
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
      <rect fill="#1e293b" width="320" height="240"/>
      <text fill="#475569" font-family="system-ui" font-size="14" text-anchor="middle" x="160" y="120">No Image</text>
    </svg>`
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }
}