// apps/pipeline/scripts/sources/update.js
/**
 * @command sources:update
 * @group Sources
 * @description Update a field on a source document. Usage: --source <Name> --key <Field> --value <JSONValue>
 */
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { getAllSources, updateSource } from '@headlines/data-access'
import { logger } from '@headlines/utils-shared'
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

  await initializeScriptEnv()
  try {
    const sourceResult = await getAllSources({
      filter: { name: new RegExp(`^${argv.source}$`, 'i') },
    })
    if (!sourceResult.success || sourceResult.data.length === 0) {
      logger.error(`Source "${argv.source}" not found.`)
      return
    }
    const source = sourceResult.data[0]

    let parsedValue
    try {
      parsedValue = JSON.parse(argv.value)
    } catch (e) {
      parsedValue = argv.value === 'null' ? undefined : argv.value
    }

    const oldValue =
      argv.key.split('.').reduce((o, i) => (o ? o[i] : undefined), source) || 'undefined'
    console.log(`\n--- Change Summary for Source: ${colors.bold(source.name)} ---`)
    console.log(`Field:      ${colors.cyan(argv.key)}`)
    console.log(`Old Value:  ${colors.red(JSON.stringify(oldValue))}`)
    console.log(`New Value:  ${colors.green(JSON.stringify(parsedValue))}`)
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

    const updateResult = await updateSource(source._id, { [argv.key]: parsedValue })
    if (!updateResult.success) throw new Error(updateResult.error)

    logger.info(
      `✅ Successfully updated field "${argv.key}" for source "${source.name}".`
    )
  } catch (error) {
    logger.error({ err: error }, 'An error occurred during the update process.')
  } finally {
    rl.close()
  }
}
main()
