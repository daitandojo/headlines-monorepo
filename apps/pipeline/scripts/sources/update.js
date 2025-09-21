// apps/pipeline/scripts/sources/update.js (version 2.0)
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import mongoose from 'mongoose'
import { Source } from '../../../../packages/models/src/index.js'
import dbConnect from '../../../../packages/data-access/src/dbConnect.js'
import { logger } from '../../../../packages/utils-server'
undefined
import readline from 'readline'
import colors from 'ansi-colors'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('source', { alias: 's', type: 'string', demandOption: true })
    .option('key', { alias: 'k', type: 'string', demandOption: true })
    .option('value', { alias: 'v', type: 'string', demandOption: true })
    .option('yes', {
      alias: 'y',
      type: 'boolean',
      description: 'Skip confirmation prompt',
    })
    .help().argv

  await dbConnect()
  try {
    const source = await Source.findOne({ name: new RegExp(`^${argv.source}$`, 'i') })
    if (!source) {
      logger.error(`Source "${argv.source}" not found.`)
      return
    }

    let parsedValue
    try {
      parsedValue = JSON.parse(argv.value)
    } catch (e) {
      parsedValue = argv.value === 'null' ? undefined : argv.value
    }

    console.log(`\n--- Change Summary for Source: ${colors.bold(source.name)} ---`)
    console.log(`Field:      ${colors.cyan(argv.key)}`)
    const oldValue = JSON.stringify(source.get(argv.key), null, 2) || 'undefined'
    console.log(`Old Value:  ${colors.red(oldValue)}`)
    console.log(`New Value:  ${colors.green(JSON.stringify(parsedValue, null, 2))}`)
    console.log('-----------------------------------------------------\n')

    if (!argv.yes) {
      const answer = await new Promise((resolve) =>
        rl.question('Apply this change? (yes/no): ', resolve)
      )
      if (answer.toLowerCase() !== 'yes') {
        logger.warn('Operation cancelled by user.')
        return
      }
    }

    const update =
      parsedValue === undefined
        ? { $unset: { [argv.key]: '' } }
        : { $set: { [argv.key]: parsedValue } }
    await Source.updateOne({ _id: source._id }, update)

    logger.info(
      `✅ Successfully updated field "${argv.key}" for source "${source.name}".`
    )
  } catch (error) {
    logger.error({ err: error }, 'An error occurred during the update process.')
  } finally {
    rl.close()
    await mongoose.disconnect()
  }
}
main()
