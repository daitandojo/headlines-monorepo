// scripts/seedDeduplicationTest.js
// One-off seeding for deduplication testing
import { initializeScriptEnv } from './seed/lib/script-init.js'
import dbConnect from '@headlines/data-access/dbConnect/node'
import { Opportunity } from '@headlines/models'

const SEED_RECORDS = [
  {
    name: "Anders Holch Povlsen",
    normalisedName: "anders holch povlsen",
    surname: "povlsen",
    contactDetails: { company: "Bestseller" },
    basedIn: ["DK"],
    type: "beneficiary",
    priority: "high"
  },
  {
    name: "Lars Larsen",
    normalisedName: "lars larsen",
    surname: "larsen",
    contactDetails: { company: "JYSK" },
    basedIn: ["DK"],
    type: "beneficiary",
    priority: "high"
  },
  {
    name: "Kim Fournais",
    normalisedName: "kim fournais",
    surname: "fournais",
    contactDetails: { company: "Saxo Bank" },
    basedIn: ["DK"],
    type: "beneficiary",
    priority: "medium"
  },
  {
    name: "Lars Seier-Christensen",
    normalisedName: "lars seierchristensen",
    surname: "christensen",
    contactDetails: { company: "Saxo Bank" },
    basedIn: ["DK"],
    type: "beneficiary",
    priority: "medium"
  }
]

async function main() {
  await initializeScriptEnv()
  await dbConnect()
  
  console.log('Seeding deduplication test records...')
  
  for (const record of SEED_RECORDS) {
    const result = await Opportunity.updateOne(
      { normalisedName: record.normalisedName },
      { $set: record },
      { upsert: true }
    )
    console.log(`  seeded: ${record.name}`)
  }
  
  console.log(`\nSeeded ${SEED_RECORDS.length} records`)
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})