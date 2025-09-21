// apps/pipeline/scripts/subscribers/update.js (version 1.0)
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import mongoose from 'mongoose'
import { Subscriber } from '../../../../packages/models/src/index.js'
import dbConnect from '../../../../packages/data-access/src/dbConnect.js'
import { logger } from '../../../../packages/utils-server'
import '@headlines/config'
import readline from 'readline'
import colors from 'ansi-colors'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('email', { type: 'string', demandOption: true })
    .option('key', { alias: 'k', type: 'string', demandOption: true })
    .option('value', { alias: 'v', type: 'string', demandOption: true })
    .option('yes', { alias: 'y', type: 'boolean' })
    .help().argv

  await dbConnect()
  try {
    const subscriber = await Subscriber.findOne({ email: argv.email })
    if (!subscriber) {
      logger.error(`Subscriber with email "${argv.email}" not found.`)
      return
    }

    let parsedValue
    try {
      parsedValue = JSON.parse(argv.value)
    } catch (e) {
      parsedValue = argv.value === 'null' ? undefined : argv.value
    }

    console.log(
      `\n--- Change Summary for Subscriber: ${colors.bold(subscriber.email)} ---`
    )
    console.log(`Field:      ${colors.cyan(argv.key)}`)
    console.log(`Old Value:  ${colors.red(JSON.stringify(subscriber.get(argv.key)))}`)
    console.log(`New Value:  ${colors.green(JSON.stringify(parsedValue))}`)
    console.log('-----------------------------------------------------\n')

    if (!argv.yes) {
      const answer = await new Promise((resolve) =>
        rl.question('Apply this change? (yes/no): ', resolve)
      )
      if (answer.toLowerCase() !== 'yes') {
        logger.warn('Operation cancelled.')
        return
      }
    }

    const update =
      parsedValue === undefined
        ? { $unset: { [argv.key]: '' } }
        : { $set: { [argv.key]: parsedValue } }
    await Subscriber.updateOne({ _id: subscriber._id }, update)

    logger.info(
      `✅ Successfully updated field "${argv.key}" for subscriber "${subscriber.email}".`
    )
  } catch (error) {
    logger.error({ err: error }, 'An error occurred during the update process.')
  } finally {
    rl.close()
    await mongoose.disconnect()
  }
}
main()
