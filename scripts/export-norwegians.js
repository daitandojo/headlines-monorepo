const fs = require('fs');

const MONGO_URI = 'mongodb+srv://haelpers:Atlas15@haelpers-m0.lz3bcwm.mongodb.net/haelpers?retryWrites=true&w=1';
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // Fetch all Norwegian opportunities
  const docs = await db.collection('opportunities').find(
    { basedIn: { $regex: /norway/i } },
    {
      projection: {
        reachOutTo: 1,
        basedIn: 1,
        city: 1,
        'contactDetails.email': 1,
        _id: 0
      }
    }
  ).sort({ lastKnownEventLiquidityMM: -1 }).toArray();

  // Known country/city separators
  const cityKeywords = ['oslo', 'bergen', 'stavanger', 'trondheim', 'fredrikstad', 'sandefjord',
    'tønsberg', 'drammen', 'skien', 'kristiansand', 'tromsø', 'bodø', 'ålesund',
    'moss', 'halden', 'harstad', 'molde', 'kristiansund', 'lillehammer', 'larvik',
    'asker', 'bærum', 'hønefoss', 'hamar', 'gjøvik', 'ålgård', 'sola', 'randaberg',
    'sandnes', 'bryne', 'klepp', 'time', 'hå', 'eigersund', 'flekkefjord',
    'mandal', 'søgne', 'vennesla', 'arendal', 'grimstad', 'lillesand', 'risør',
    'tvedestrand', 'brevik', 'porsgrunn', 'notodden', 'kongsberg', 'hole',
    'røyken', 'hurum', 'øvre eiker', 'nedre eiker', 'lier', 'modum', 'tyristrand',
    'sokna', 'vikersund', 'geithus', 'åmot', 'renå', 'tretten', 'ørje',
    'mysen', 'askim', 'spydeberg', 'vestby', 'ås', 'ski', 'oppegård', 'kolbotn',
    'lørenskog', 'skedsmo', 'lillestrøm', 'nittedal', 'gjerdrum', 'ullensaker',
    'sørumsand', 'fet', 'rælingen', 'eidsvoll', 'gardermoen', 'namestad',
    'lunner', 'gran', 'jaren', 'hadeland', 'brandbu', 'røyse', 'sundvollen',
    'krokkleiva', 'sørby', 'hvalsmoen', 'hønefossnæringspark'];

  // Filter city-like entries from basedIn
  function extractCity(basedIn, cityField) {
    // If explicit city field exists, use it
    if (cityField && cityField.trim()) {
      return cityField.trim();
    }

    if (!basedIn || !Array.isArray(basedIn)) return '';

    // Look through basedIn for city names
    for (const entry of basedIn) {
      if (!entry) continue;
      const lower = entry.toLowerCase().trim();

      // Skip country-level entries
      if (['norway', 'denmark', 'sweden', 'finland', 'netherlands', 'united states',
        'united kingdom', 'germany', 'france', 'switzerland', 'belgium', 'spain',
        'italy', 'china', 'thailand', 'russian federation', 'scandinavia',
        'uk', 'usa', 'dk', 'unknown', 'europe'].includes(lower)) {
        continue;
      }

      // If it matches a known Norwegian city, use it
      if (cityKeywords.some(k => lower.includes(k))) {
        return entry.trim();
      }

      // If it contains a comma (e.g. "Oslo, Norway"), extract city part
      if (lower.includes(',')) {
        const parts = entry.split(',').map(p => p.trim());
        return parts[0];
      }

      // If it's a single word that's not a country, it might be a city
      if (!entry.includes(' ') && entry.length > 2) {
        return entry.trim();
      }
    }

    return '';
  }

  function extractEmail(doc) {
    if (doc.contactDetails && doc.contactDetails.email &&
        typeof doc.contactDetails.email === 'string' &&
        doc.contactDetails.email.includes('@')) {
      return doc.contactDetails.email;
    }
    return '';
  }

  // CSV header
  const lines = ['name,city,email'];

  for (const doc of docs) {
    const name = (doc.reachOutTo || '').replace(/"/g, '""');
    const city = extractCity(doc.basedIn, doc.city).replace(/"/g, '""');
    const email = extractEmail(doc).replace(/"/g, '""');
    lines.push(`"${name}","${city}","${email}"`);
  }

  const csv = lines.join('\n');
  const outPath = '/home/mark/People/norwegians.csv';

  // Ensure directory exists
  const dir = '/home/mark/People';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outPath, csv, 'utf8');
  console.log(`Written ${docs.length} rows to ${outPath}`);

  // Quick stats
  const withEmail = docs.filter(d => extractEmail(d)).length;
  const withCity = docs.filter(d => extractCity(d.basedIn, d.city)).length;
  console.log(`With email: ${withEmail}`);
  console.log(`With city: ${withCity}`);

  await mongoose.disconnect();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
