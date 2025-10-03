// packages/data-access/src/dbConnect.next.js
import { env } from '@headlines/config/next'
import { dbConnect as coreDbConnect } from './dbConnect.core.js'

export default function dbConnect() {
  return coreDbConnect(env.MONGO_URI)
}
