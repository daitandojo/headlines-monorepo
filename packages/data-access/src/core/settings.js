// packages/data-access/src/core/settings.js
import { Setting } from '@headlines/models'
// The environment-specific import has been removed.
// import { revalidatePath } from '../revalidate.js'

export async function getSettings() {
  try {
    const settings = await Setting.find({}).sort({ key: 1 }).lean()
    return { success: true, data: JSON.parse(JSON.stringify(settings)) }
  } catch (e) {
    console.error('[getSettings Error]', e)
    return { success: false, error: 'Failed to fetch settings.' }
  }
}

export async function updateSettings(settingsData) {
  try {
    const bulkOps = settingsData.map((setting) => {
      let castValue = setting.value
      if (setting.type === 'number') castValue = Number(setting.value)
      if (setting.type === 'boolean') castValue = Boolean(setting.value)
      return {
        updateOne: {
          filter: { key: setting.key },
          update: {
            $set: {
              value: castValue,
              description: setting.description,
              type: setting.type,
            },
          },
          upsert: true,
        },
      }
    })

    if (bulkOps.length > 0) {
      await Setting.bulkWrite(bulkOps)
    }

    // Revalidation is now handled by the environment-specific wrapper.
    // await revalidatePath('/admin/settings')
    return { success: true, message: `${bulkOps.length} settings updated.` }
  } catch (e) {
    console.error('[updateSettings Error]', e)
    return { success: false, error: 'Failed to update settings.' }
  }
}
