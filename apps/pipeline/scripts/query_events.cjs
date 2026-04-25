// Quick script to fetch today's events and opportunities
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || 'mongodb+srv://haelpers:haelpers-m0.lz3bcwm.mongodb.net/haelpers?retryWrites=true&w=1';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    
    // Today's events
    const events = await db.collection('synthesizedevents').find({
      createdAt: { $gte: new Date('2026-04-21T00:00:00Z'), $lte: new Date('2026-04-21T23:59:59Z') },
      status: 'committed'
    }).toArray();

    console.log('=== APPROVED EVENTS ===');
    events.forEach(e => console.log(`[${e.highest_relevance_score}] ${e.synthesized_headline}`));

    // Today's opportunities
    const opps = await db.collection('opportunities').find({
      createdAt: { $gte: new Date('2026-04-21T00:00:00Z'), $lte: new Date('2026-04-21T23:59:59Z') }
    }).toArray();

    console.log('\n=== TODAY OPPORTUNITIES ===');
    opps.forEach(o => console.log(`- ${o.reachOutTo} | ${o.lastKnownEventLiquidityMM || '?'}M | ${o.basedIn}`));

  } finally {
    await client.close();
  }
}

main().catch(console.error);