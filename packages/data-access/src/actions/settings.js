// packages/data-access/src/actions/settings.js (version 2.0.1)
'use server'

import { Setting } from '../../../models/src/index.js'
import dbConnect from '../dbConnect.js'
import { revalidatePath } from '../revalidate.js'

export async function getSettings() {
  try {
    await dbConnect()
    const settings = await Setting.find({}).sort({ key: 1 }).lean()
    return { success: true, data: JSON.parse(JSON.stringify(settings)) }
  } catch (e) {
    return { success: false, error: 'Failed to fetch settings.' }
  }
}

export async function updateSettings(settingsData) {
  try {
    await dbConnect()
    const bulkOps = settingsData.map((setting) => {
      let castValue = setting.value
      if (setting.type === 'number') castValue = Number(setting.value)
      if (setting.type === 'boolean') castValue = Boolean(setting.value)
      return {
        updateOne: {
          filter: { _id: setting._id },
          update: { $set: { value: castValue } },
        },
      }
    })
    if (bulkOps.length > 0) {
      await Setting.bulkWrite(bulkOps)
    }
    await revalidatePath('/admin/settings')
    return { success: true, message: `${bulkOps.length} settings updated.` }
  } catch (e) {
    return { success: false, error: 'Failed to update settings.' }
  }
}
