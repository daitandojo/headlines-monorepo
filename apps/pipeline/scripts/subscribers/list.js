// apps/pipeline/scripts/subscribers/list.js (version 1.0)
import dbConnect from '../../../../packages/data-access/src/dbConnect.js'
import { Subscriber } from '../../../../packages/models/src/index.js'
import mongoose from 'mongoose'
import colors from 'ansi-colors'

async function listSubscribers() {
  await dbConnect()
  try {
    const subscribers = await Subscriber.find({}).sort({ email: 1 }).lean()

    if (subscribers.length === 0) {
      console.log('No subscribers found.')
      return
    }

    const tableData = subscribers.map((s) => {
      let status = s.isActive ? colors.green('Active') : colors.red('Inactive')
      if (s.role === 'admin') {
        status += ` / ${colors.yellow('Admin')}`
      }
      return {
        Email: s.email,
        Name: `${s.firstName} ${s.lastName || ''}`,
        Status: status,
        Tier: s.subscriptionTier,
        Countries: s.countries.length,
      }
    })
    console.log('\n--- All Subscribers ---')
    console.table(tableData)
  } catch (e) {
    console.error('Error listing subscribers:', e)
  } finally {
    await mongoose.disconnect()
  }
}

listSubscribers()
