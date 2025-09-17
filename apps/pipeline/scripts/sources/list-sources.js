// apps/pipeline/scripts/sources/list-sources.js (version 3.0.0)
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import mongoose from 'mongoose';
import { Source } from '../../../../packages/models/src/index.js';
import dbConnect from '../../../../packages/data-access/src/dbConnect.js';
import colors from 'ansi-colors';

async function listSources() {
  const argv = yargs(hideBin(process.argv))
    .option('country', { alias: 'c', type: 'string' })
    .option('status', { alias: 's', type: 'string', choices: ['failing', 'healthy'] })
    .option('json', { type: 'boolean', description: 'Output as JSON' })
    .help().argv;
  
  await dbConnect();
  try {
    const query = { status: 'active' };
    if (argv.country) query.country = new RegExp(`^${argv.country}$`, 'i');
    if (argv.status === 'failing') {
        query['analytics.lastRunHeadlineCount'] = 0;
        query['analytics.totalRuns'] = { $gt: 0 };
    } else if (argv.status === 'healthy') {
        query['analytics.lastRunHeadlineCount'] = { $gt: 0 };
    }

    const sources = await Source.find(query).sort({ country: 1, name: 1 }).lean();
    
    if (argv.json) {
        console.log(JSON.stringify(sources, null, 2));
        return;
    }

    if (sources.length === 0) {
      console.log('No sources found matching criteria.');
      return;
    }
    
    const tableData = sources.map(s => {
        const analytics = s.analytics || {};
        let health = colors.yellow('❓ New');
        if (analytics.totalRuns > 0) {
          health = analytics.lastRunHeadlineCount > 0 ? colors.green('✅ Healthy') : colors.red('❌ Failing');
        }
        return {
          Name: s.name,
          Health: health,
          'Last Count': analytics.lastRunHeadlineCount ?? 'N/A',
          Country: s.country,
          Method: s.extractionMethod,
        };
      });
    console.table(tableData);

  } finally {
    await mongoose.disconnect();
  }
}
listSources();
