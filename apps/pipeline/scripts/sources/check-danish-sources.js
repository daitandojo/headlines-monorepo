// scripts/check-danish-sources.js
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import cliProgress from 'cli-progress'
import colors from 'ansi-colors'

const DATA_DIRECTORY = '/mnt/ramdisk'

// GDELT GKG headers
const GKG_HEADERS = [
  'GKGRECORDID',
  'Date',
  'SourceCollectionIdentifier',
  'SourceCommonName',
  'DocumentIdentifier',
  'V1Themes',
  'V2Themes',
  'V1Locations',
  'V2Locations',
  'V1Persons',
  'V2Persons',
  'V1Organizations',
  'V2Organizations',
  'V1_5Tone',
  'V2Tone',
  'Dates',
  'GCAM',
  'SharingImage',
  'RelatedImages',
  'SocialImageEmbeds',
  'SocialVideoEmbeds',
  'Quotations',
  'AllNames',
  'Amounts',
  'TranslationInfo',
  'Extras',
]

// Specific Danish sources we're looking for
const TARGET_DANISH_SOURCES = [
  'detelegraaf',
  'berlingske.dk',
  'finans.dk',
  'politiken.dk',
  'dr.dk',
  'tv2.dk',
  'bt.dk',
  'eb.dk',
  'jyllands-posten.dk',
  'information.dk',
  'kristeligt-dagblad.dk',
  'weekendavisen.dk',
]

async function checkDanishSources() {
  const files = fs.readdirSync(DATA_DIRECTORY).filter((f) => f.endsWith('.csv'))

  if (files.length === 0) {
    console.log('No CSV files found in', DATA_DIRECTORY)
    return
  }

  console.log(`🔍 Checking ${files.length} GDELT files for specific Danish sources...`)
  console.log(`Target sources: ${TARGET_DANISH_SOURCES.join(', ')}`)
  console.log(`Data directory: ${DATA_DIRECTORY}\n`)

  let totalRows = 0
  let foundSources = new Map() // source -> count
  let sourceExamples = new Map() // source -> example URLs
  let fileHits = new Map() // file -> hits count

  const progressBar = new cliProgress.SingleBar({
    format: `  -> Processing | ${colors.cyan('{bar}')} | {percentage}% || {value}/{total} Files`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  })

  progressBar.start(files.length, 0)

  for (const file of files) {
    const filePath = path.join(DATA_DIRECTORY, file)
    let fileContent

    try {
      fileContent = fs.readFileSync(filePath, 'utf8')
    } catch (error) {
      console.log(`\nError reading file ${file}:`, error.message)
      progressBar.increment()
      continue
    }

    const result = Papa.parse(fileContent, {
      delimiter: '\t',
      header: false,
      skipEmptyLines: true,
      dynamicTyping: false,
    })

    let fileHitCount = 0

    for (const record of result.data) {
      if (!record || record.length < GKG_HEADERS.length) continue

      totalRows++

      // Map headers to row data
      const row = {}
      GKG_HEADERS.forEach((header, i) => {
        row[header] = record[i] || ''
      })

      // Check both SourceCommonName and DocumentIdentifier for Danish sources
      const sourceName = (row.SourceCommonName || '').toLowerCase()
      const documentUrl = (row.DocumentIdentifier || '').toLowerCase()

      for (const targetSource of TARGET_DANISH_SOURCES) {
        const targetLower = targetSource.toLowerCase()

        if (sourceName.includes(targetLower) || documentUrl.includes(targetLower)) {
          foundSources.set(targetSource, (foundSources.get(targetSource) || 0) + 1)
          fileHitCount++

          // Store example URL for this source
          if (!sourceExamples.has(targetSource) && documentUrl) {
            sourceExamples.set(targetSource, documentUrl)
          }
          break // Found a match, no need to check other sources
        }
      }
    }

    if (fileHitCount > 0) {
      fileHits.set(file, fileHitCount)
    }

    progressBar.increment()
  }

  progressBar.stop()

  console.log('\n📊 Results:')
  console.log(`Total articles processed: ${totalRows.toLocaleString()}`)
  console.log(`Files with Danish sources: ${fileHits.size}/${files.length}`)
  console.log('')

  // Display found sources
  if (foundSources.size === 0) {
    console.log('❌ No articles from the specified Danish sources found!')
    console.log('')
    console.log('Possible reasons:')
    console.log('1. The GDELT files might not contain these specific sources')
    console.log('2. The sources might use different domain patterns')
    console.log('3. The time period might not have coverage from these sources')
    console.log('4. There might be encoding/parsing issues')
  } else {
    console.log('✅ Found articles from these Danish sources:')
    console.log('')

    const sortedSources = Array.from(foundSources.entries()).sort((a, b) => b[1] - a[1])

    for (const [source, count] of sortedSources) {
      const exampleUrl = sourceExamples.get(source) || 'No URL example'
      console.log(`📰 ${source.padEnd(20)}: ${count.toString().padStart(4)} articles`)
      console.log(
        `   Example: ${exampleUrl.substring(0, 80)}${exampleUrl.length > 80 ? '...' : ''}`
      )
      console.log('')
    }

    // Show which files contained Danish sources
    console.log('📁 Files containing Danish sources:')
    const sortedFiles = Array.from(fileHits.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Show top 10 files

    for (const [file, count] of sortedFiles) {
      console.log(`   ${file}: ${count} articles`)
    }

    if (fileHits.size > 10) {
      console.log(`   ... and ${fileHits.size - 10} more files`)
    }
  }

  // Additional diagnostic: Check for any .dk domains
  console.log('\n🔍 Scanning for ANY .dk domains (broader search)...')

  let dkDomainsFound = new Map()
  let sampleDkUrls = new Map()

  for (const file of files.slice(0, 105)) {
    // Check first 5 files for speed
    const filePath = path.join(DATA_DIRECTORY, file)
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n')

      for (const line of lines.slice(0, 1000)) {
        // Check first 1000 lines
        const columns = line.split('\t')
        if (columns.length >= 5) {
          const source = (columns[3] || '').toLowerCase() // SourceCommonName
          const url = (columns[4] || '').toLowerCase() // DocumentIdentifier

          if (source.includes('.dk') || url.includes('.dk')) {
            // Extract domain
            let domain = null
            if (url.includes('.dk')) {
              const match = url.match(/([a-zA-Z0-9-]+\.dk)/)
              if (match) domain = match[1]
            }
            if (!domain && source.includes('.dk')) {
              const match = source.match(/([a-zA-Z0-9-]+\.dk)/)
              if (match) domain = match[1]
            }

            if (domain) {
              dkDomainsFound.set(domain, (dkDomainsFound.get(domain) || 0) + 1)
              if (!sampleDkUrls.has(domain)) {
                sampleDkUrls.set(domain, url)
              }
            }
          }
        }
      }
    } catch (error) {
      // Skip file errors
    }
  }

  if (dkDomainsFound.size > 0) {
    console.log('\n🌐 Found these .dk domains in the data:')
    const sortedDkDomains = Array.from(dkDomainsFound.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)

    for (const [domain, count] of sortedDkDomains) {
      console.log(`   ${domain.padEnd(25)}: ${count} occurrences`)
    }
  } else {
    console.log('   No .dk domains found in sample scan')
  }
}

// Run the analysis
checkDanishSources().catch((error) => {
  console.error('❌ Analysis failed:', error.message)
  process.exit(1)
})
