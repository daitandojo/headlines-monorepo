import 'server-only'
import { env } from '@headlines/config/next'
import dbConnectCore from './dbConnectCore.js'
import { logger } from '@headlines/utils-shared'

console.log('📦 [dbConnect.next.js] Module loaded')

// This is the Next.js-specific implementation of dbConnect.
// It uses the core logic but provides the environment variables from the Next.js context.
export default function dbConnect() {
  console.log('🟦 [dbConnect.next] Called at:', new Date().toISOString())
  console.log('🟦 [dbConnect.next] About to call dbConnectCore...')
  const result = dbConnectCore(env.MONGO_URI, logger)
  console.log('🟦 [dbConnect.next] dbConnectCore returned, awaiting result...')
  return result
}
