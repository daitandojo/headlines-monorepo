// apps/admin/src/app/api/scrape/test-config/route.js (version 2.0.0)
import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { initializeSharedLogic } from '@/lib/init-shared-logic.js'
import { testSourceConfig } from '@headlines/data-access'
import { verifyAdmin } from '@headlines/auth'

export async function POST(request) {
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    await initializeSharedLogic()
    const sourceConfig = await request.json()

    if (!sourceConfig || !sourceConfig.sectionUrl || !sourceConfig._id) {
      return NextResponse.json(
        { error: 'Full source configuration with _id is required.' },
        { status: 400 }
      )
    }

    const result = await testSourceConfig(sourceConfig)

    if (!result.success) {
      throw new Error(result.details || 'Test scrape failed in the data-access layer.')
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error(`[API Test Config Route Error]`, error)
    return NextResponse.json(
      { success: false, error: 'Failed to perform test scrape.', details: error.message },
      { status: 500 }
    )
  }
}
