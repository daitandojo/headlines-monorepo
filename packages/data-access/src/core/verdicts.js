// packages/data-access/src/core/verdicts.js
import { RunVerdict, SynthesizedEvent, Opportunity } from '@headlines/models'
import mongoose from 'mongoose'

export async function getRecentRunVerdicts() {
  try {
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

export async function getRunVerdictById(runId) {
  try {
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
