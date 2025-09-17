// packages/data-access/src/actions/verdicts.js (version 1.1.0)
'use server'

import { RunVerdict, SynthesizedEvent, Opportunity } from '@headlines/models'
import { verifyAdmin } from '@headlines/auth'
import dbConnect from '../dbConnect.js'

export async function getRecentRunVerdicts() {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()
    // MODIFICATION: Select the entire 'runStats' object instead of individual fields.
    // This provides the detailed data needed for the new dashboard view, including
    // relevantHeadlines and enrichmentOutcomes for funnel analysis.
    const verdicts = await RunVerdict.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('runStats createdAt')
      .lean()
    return { success: true, data: JSON.parse(JSON.stringify(verdicts)) }
  } catch (e) {
    return { success: false, error: 'Failed to fetch run verdicts.' }
  }
}

export async function getRunVerdictById(runId) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()
    const verdict = await RunVerdict.findById(runId)
      .populate({ path: 'generatedEvents', model: SynthesizedEvent })
      .populate({ path: 'generatedOpportunities', model: Opportunity })
      .lean()
    if (!verdict) return { success: false, error: 'Verdict not found.' }
    return { success: true, data: JSON.parse(JSON.stringify(verdict)) }
  } catch (e) {
    return { success: false, error: 'Failed to fetch verdict details.' }
  }
}
