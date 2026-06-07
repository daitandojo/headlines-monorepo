// apps/client/src/app/api-admin/intelligence/exclusions/route.js
import { NextResponse } from 'next/server'
import dbConnect from '@headlines/data-access/dbConnect/next'
import { Setting } from '@headlines/models/next'

const SETTING_KEY = 'ENRICHMENT_EXCLUSIONS'

const DEFAULT_EXCLUSIONS = [
  'elon musk', 'donald trump', 'sam altman', 'openai', 'anthropic',
  'jeff bezos', 'bill gates', 'mark zuckerberg', 'warren buffett',
  'larry page', 'sergey brin', 'tim cook', 'satya nadella',
]

export async function GET() {
  try {
    await dbConnect()
    const setting = await Setting.findOne({ key: SETTING_KEY }).lean()
    const list = setting?.value || DEFAULT_EXCLUSIONS
    return NextResponse.json({ exclusions: list })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await dbConnect()
    const body = await request.json()
    const { name, action } = body
    if (!name || !action) {
      return NextResponse.json({ error: 'name and action required' }, { status: 400 })
    }

    const setting = await Setting.findOne({ key: SETTING_KEY }).lean()
    let list = setting?.value || DEFAULT_EXCLUSIONS
    const lower = name.toLowerCase().trim()

    if (action === 'add') {
      if (list.includes(lower)) {
        return NextResponse.json({ error: 'Already excluded' }, { status: 409 })
      }
      list = [...list, lower]
    } else if (action === 'remove') {
      list = list.filter(e => e !== lower)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    await Setting.updateOne(
      { key: SETTING_KEY },
      { $set: { value: list } },
      { upsert: true }
    )

    return NextResponse.json({ exclusions: list })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}