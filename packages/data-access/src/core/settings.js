'use server'

import { Setting } from '@headlines/models'
import dbConnect from '../dbConnect.js' // Ensure dbConnect is imported
import { revalidatePath } from '../revalidate.js'

export async function getSettings() {
  try {
    await dbConnect() // <-- ADD THIS LINE
    const settings = await Setting.find({}).sort({ key: 1 }).lean()
    return { success: true, data: JSON.parse(JSON.stringify(settings)) }
  } catch (e) {
    console.error('[getSettings Error]', e) // Add more specific logging
    return { success: false, error: 'Failed to fetch settings.' }
  }
}

export async function updateSettings(settingsData) {
  try {
    await dbConnect() // <-- ADD THIS LINE
    const bulkOps = settingsData.map((setting) => {
      let castValue = setting.value
      if (setting.type === 'number') castValue = Number(setting.value)
      if (setting.type === 'boolean') castValue = Boolean(setting.value)
      return {
        updateOne: {
          filter: { key: setting.key },
          // Use $set to ensure the entire setting object is updated, not just the value
          update: {
            $set: {
              value: castValue,
              description: setting.description,
              type: setting.type,
            },
          },
          upsert: true, // Use upsert to be safe
        },
      }
    })

    if (bulkOps.length > 0) {
      await Setting.bulkWrite(bulkOps)
    }

    await revalidatePath('/admin/settings')
    return { success: true, message: `${bulkOps.length} settings updated.` }
  } catch (e) {
    console.error('[updateSettings Error]', e) // Add more specific logging
    return { success: false, error: 'Failed to update settings.' }
  }
}
