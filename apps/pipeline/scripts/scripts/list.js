// apps/pipeline/scripts/scripts/list.js
/**
 * @command cli:help
 * @group CLI
 * @description Shows a dynamic list of all available pipeline CLI commands.
 */
import fs from 'fs'
import path from 'path'
import colors from 'ansi-colors'

const SCRIPTS_ROOT = path.resolve(process.cwd(), 'apps/pipeline/scripts')
const EXCLUDED_DIRS = ['lib', 'data', 'node_modules']

/**
 * Recursively walks a directory to find all .js files, excluding specified directories.
 * @param {string} dir - The directory to walk.
 * @returns {string[]} An array of full file paths.
 */
function walkDir(dir) {
  let files = []
  const items = fs.readdirSync(dir, { withFileTypes: true })

  for (const item of items) {
    if (EXCLUDED_DIRS.includes(item.name)) {
      continue
    }
    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) {
      files = [...files, ...walkDir(fullPath)]
    } else if (item.isFile() && item.name.endsWith('.js')) {
      files.push(fullPath)
    }
  }
  return files
}

/**
 * Reads the first few lines of a script and parses its metadata block.
 * @param {string} filePath - The full path to the script file.
 * @returns {object|null} An object with command, group, and description, or null if no header is found.
 */
function parseScriptHeader(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8').substring(0, 1024) // Read first 1KB
    const match = content.match(/\/\*\*([\s\S]*?)\*\//) // Find the first JSDoc-style block
    if (!match) return null

    const header = match[1]
    const commandMatch = header.match(/@command\s+(.*)/)
    const groupMatch = header.match(/@group\s+(.*)/)
    const descriptionMatch = header.match(/@description\s+(.*)/)

    if (commandMatch && groupMatch && descriptionMatch) {
      return {
        command: commandMatch[1].trim(),
        group: groupMatch[1].trim(),
        description: descriptionMatch[1].trim(),
      }
    }
    return null
  } catch (e) {
    return null
  }
}

function main() {
  console.log(colors.bold.cyan('\n📘 Headlines Pipeline CLI (Dynamic)\n'))
  console.log('Usage from monorepo root: pnpm run <command> -- [flags]\n')

  const scriptFiles = walkDir(SCRIPTS_ROOT)
  const scriptsWithMetadata = scriptFiles.map(parseScriptHeader).filter(Boolean)

  if (scriptsWithMetadata.length === 0) {
    console.log(colors.red('No runnable scripts with valid metadata headers found.'))
    return
  }

  const groupedScripts = scriptsWithMetadata.reduce((acc, script) => {
    const group = script.group || 'General'
    if (!acc[group]) acc[group] = []
    acc[group].push(script)
    return acc
  }, {})

  const sortedGroups = Object.keys(groupedScripts).sort()

  for (const groupName of sortedGroups) {
    console.log(colors.bold.yellow(`--- ${groupName} ---`))
    const scriptsInGroup = groupedScripts[groupName].sort((a, b) =>
      a.command.localeCompare(b.command)
    )

    scriptsInGroup.forEach((script) => {
      console.log(`  ${colors.green(script.command.padEnd(25))} ${script.description}`)
    })
    console.log('')
  }
}

main()
