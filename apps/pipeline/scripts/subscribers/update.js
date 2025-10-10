// apps/pipeline/scripts/subscribers/update.js
/**
 * @command subscribers:update
 * @group Subscribers
 * @description Update a field for a subscriber. Use --help to see available fields.
 */
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { findSubscribers, updateSubscriber } from '@headlines/data-access'
import { Subscriber } from '@headlines/models'
import { logger } from '@headlines/utils-shared'
import readline from 'readline'
import colors from 'ansi-colors'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

async function main() {
  // Get all updatable keys from the Mongoose schema, excluding immutable ones.
  const updatableKeys = Object.keys(Subscriber.schema.paths).filter(
    (key) => !['_id', '__v', 'createdAt', 'updatedAt', 'email'].includes(key)
  )

  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 --email <Email> --key <Field> --value <JSONValue> [--yes]')
    .option('email', {
      type: 'string',
      description: 'The email address of the subscriber to update.',
    })
    .option('key', {
      alias: 'k',
      type: 'string',
      description: 'The field to update.',
      choices: updatableKeys, // Restrict choices to valid schema paths
    })
    .option('value', {
      alias: 'v',
      type: 'string',
      description: 'The new value (in JSON format for booleans/numbers).',
    })
    .option('yes', {
      alias: 'y',
      type: 'boolean',
      description: 'Skip the confirmation prompt.',
    })
    .demandOption(
      ['email', 'key', 'value'],
      'Please provide email, key, and value arguments.'
    )
    .help('help')
    .alias('help', 'h')
    .epilogue(`Available keys to update:\n  - ${updatableKeys.join('\n  - ')}`).argv

  await initializeScriptEnv()
  try {
    const findResult = await findSubscribers({ filter: { email: argv.email } })
    if (!findResult.success || findResult.data.length === 0) {
      logger.error(`Subscriber with email "${argv.email}" not found.`)
      return
    }
    const subscriber = findResult.data[0]

    let parsedValue
    try {
      // Attempt to parse value as JSON (handles booleans, numbers, etc.)
      parsedValue = JSON.parse(argv.value)
    } catch (e) {
      // If it fails, treat it as a string, but handle 'null' specifically
      parsedValue = argv.value === 'null' ? null : argv.value
    }

    const oldValue = subscriber[argv.key]

    console.log(
      `\n--- Change Summary for Subscriber: ${colors.bold(subscriber.email)} ---`
    )
    console.log(`Field:      ${colors.cyan(argv.key)}`)
    console.log(`Old Value:  ${colors.red(JSON.stringify(oldValue))}`)
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

    // Using updateSubscriber from data-access layer
    const updateResult = await updateSubscriber(subscriber._id, {
      [argv.key]: parsedValue,
    })

    if (!updateResult.success) {
      throw new Error(updateResult.error)
    }

    logger.info(
      `✅ Successfully updated field "${argv.key}" for subscriber "${subscriber.email}".`
    )
  } catch (error) {
    logger.error({ err: error }, 'An error occurred during the update process.')
  } finally {
    rl.close()
  }
}

main()
