// packages/data-access/src/actions/settings.js (version 1.0.1)
'use server'

import { Setting } from '@headlines/models'
import { verifyAdmin } from '@headlines/auth'
import dbConnect from '../dbConnect.js'
import { revalidatePath } from '../revalidate.js'

export async function getSettings() {
    const { isAdmin, error } = await verifyAdmin()
    if (!isAdmin) return { success: false, error }

    try {
        await dbConnect()
        const settings = await Setting.find({}).sort({ key: 1 }).lean();
        return { success: true, data: JSON.parse(JSON.stringify(settings)) }
    } catch(e) {
        return { success: false, error: 'Failed to fetch settings.' }
    }
}

export async function updateSettings(settingsData) {
    const { isAdmin, error } = await verifyAdmin()
    if (!isAdmin) return { success: false, error }

    try {
        await dbConnect()
        const bulkOps = settingsData.map(setting => {
            let castValue = setting.value;
            if (setting.type === 'number') castValue = Number(setting.value);
            if (setting.type === 'boolean') castValue = Boolean(setting.value);
            return { updateOne: { filter: { _id: setting._id }, update: { $set: { value: castValue } } } };
        });
        if (bulkOps.length > 0) {
            await Setting.bulkWrite(bulkOps);
        }
        await revalidatePath('/admin/settings')
        return { success: true, message: `${bulkOps.length} settings updated.` }
    } catch(e) {
        return { success: false, error: 'Failed to update settings.' }
    }
}
