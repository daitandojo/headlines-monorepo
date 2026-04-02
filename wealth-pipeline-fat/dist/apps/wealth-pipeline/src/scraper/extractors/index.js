// apps/headlines-pipeline/src/scraper/extractors/index.ts
import { cvcPortfolioExtractor } from './cvc.js';
import { finansDkExtractor } from './finansDk.js';
import { jyllandsPostenExtractor } from './jyllandsPosten.js';
import { okonomiskUgebrevExtractor } from './okonomiskUgebrev.js';
import { politikenExtractor } from './politiken.js';
import { verdaneExtractor } from './verdane.js';
export const customExtractors = {
    'cvc_portfolio': cvcPortfolioExtractor,
    'finans_dk': finansDkExtractor,
    'jyllands_posten': jyllandsPostenExtractor,
    'okonomisk_ugebrev': okonomiskUgebrevExtractor,
    'politiken': politikenExtractor,
    'verdane': verdaneExtractor
};
//# sourceMappingURL=index.js.map