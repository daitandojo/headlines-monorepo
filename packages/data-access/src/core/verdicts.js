import { RunVerdict, SynthesizedEvent, Opportunity } from '@headlines/models'
import dbConnect from '../dbConnect.js'
import mongoose from 'mongoose'

// This function now assumes authentication has already been handled by the caller.
export async function getRecentRunVerdicts() {
  try {
    await dbConnect()
    const verdicts = await RunVerdict.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('runStats createdAt')
      .lean()
    return { success: true, data: JSON.parse(JSON.stringify(verdicts)) }
  } catch (e) {
    console.error('[getRecentRunVerdicts Error]', e)
    return { success: false, error: 'Failed to fetch run verdicts.' }
  }
}

// This function is now purely for data retrieval.
export async function getRunVerdictById(runId) {
  try {
    await dbConnect()
    const verdict = await RunVerdict.findById(runId)
      .populate({ path: 'generatedEvents', model: SynthesizedEvent })
      .populate({ path: 'generatedOpportunities', model: Opportunity })
      .lean()
    if (!verdict) return { success: false, error: 'Verdict not found.' }
    return { success: true, data: JSON.parse(JSON.stringify(verdict)) }
  } catch (e) {
    console.error('[getRunVerdictById Error]', e)
    return { success: false, error: 'Failed to fetch verdict details.' }
  }
}
