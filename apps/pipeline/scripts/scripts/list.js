// apps/pipeline/scripts/scripts/list.js (version 3.1.0)
import fs from 'fs';
import path from 'path';
import colors from 'ansi-colors';

const packageJsonPath = path.resolve(process.cwd(), 'apps/pipeline/package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const scripts = packageJson.scripts;

const scriptDescriptions = {
    "start": "Run the main pipeline. Flags: --country, --source, --isRefreshMode, --deleteToday, --noCommitMode, --useTestPayload.",
    "test": "Run the Jest test suite for the pipeline.",
    "db:seed:all": "Run all seeding scripts (settings, countries, admin user).",
    "db:seed:settings": "Seed or update the pipeline settings in the database.",
    "db:seed:countries": "Seed or update the list of countries from the canonical JSON file.",
    "db:seed:admin": "Seed or update the primary admin user.",
    "sources:list": "List sources. Flags: --country, --status [failing|healthy], --json.",
    "sources:scrape-one": "Scrape a single source for debugging. Flags: --source <SourceName>.",
    "sources:scrape-many": "Scrape multiple sources. Flags: --country <CountryName>.",
    "sources:discover": "Crawl a domain to find new news sections. Flags: --url <BaseURL>.",
    "sources:optimize": "Analyze a URL to suggest optimal CSS selectors. Flags: --url <URL>.",
    "sources:update": "Update a field on a source document. Usage: --source <Name> --key <Field> --value <JSONValue>",
    "sources:browse": "Interactively browse a website to find sections and selectors. Usage: --url <URL>",
    "sources:maintain": "Run the autonomous agent to find, fix, and prune sources.",
    "subscribers:list": "List all subscribers in the database.",
    "subscribers:update": "Update a field for a subscriber. Usage: --email <Email> --key <Field> --value <JSONValue>",
    "watchlist:list": "List watchlist entities. Flags: --q <SearchQuery>",
    "watchlist:add-term": "Add a search term to a watchlist entity. Usage: --name <EntityName> --term <SearchTerm>",
    "results:list-events": "Show the 10 most recently created synthesized events.",
    "maintenance:delete-today": "Delete all data created today. Flags: --yes.",
};

console.log(colors.bold.cyan("\n📘 Headlines Pipeline CLI\n"));
console.log("Usage: npm run <command> -w @headlines/pipeline -- [flags]\n");

const groupedScripts = {};
Object.keys(scripts).forEach(key => {
    if (!scriptDescriptions[key] && !key.startsWith('scripts:')) return;
    const [topic] = key.split(':');
    if (!groupedScripts[topic]) groupedScripts[topic] = [];
    groupedScripts[topic].push(key);
});

for (const topic in groupedScripts) {
    const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
    console.log(colors.bold.yellow(`--- ${topic.charAt(0).toUpperCase() + topic.slice(1)} ---`));
    groupedScripts[topic].sort().forEach(scriptName => {
        console.log(`  ${colors.green(scriptName.padEnd(25))} ${scriptDescriptions[scriptName] || ''}`);
    });
    console.log('');
}
