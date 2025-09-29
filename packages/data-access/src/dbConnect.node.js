import { env } from '@headlines/config/node'
import { dbConnect as coreDbConnect } from './dbConnect.core.js'

export default function dbConnect() {
  return coreDbConnect(env.MONGO_URI)
}
