// packages/scraper-logic/src/scraper/selectorOptimizer.js (version 4.2)
import * as cheerio from 'cheerio';

const NEGATIVE_TAGS = ['nav', 'footer', 'aside', 'header', 'form', '.popup-overlay'];

/**
 * Finds clusters of repeated elements by analyzing class name frequency.
 * CRITICALLY, it filters out Tailwind-style classes with colons.
 */
function findRepeatingClassSelectors($) {
    const classCounts = {};
    $('*').each((_, el) => {
        const classes = $(el).attr('class');
        if (classes) {
            classes.trim().split(/\s+/).forEach(cls => {
                // DEFINITIVE FIX: Ignore any class containing a colon to prevent pseudo-class errors.
                if (cls.length > 5 && !cls.includes(':') && !cls.startsWith('js-')) {
                    classCounts[cls] = (classCounts[cls] || 0) + 1;
                }
            });
        }
    });

    return Object.entries(classCounts)
        .filter(([_, count]) => count > 3 && count < 100)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15) // Widen the search slightly
        .map(([cls]) => `.${cls}`);
}

/**
 * For a given container element, finds the most likely headline text.
 */
function analyzeContainer($container) {
    const headlineEl = $container.find('h1, h2, h3, h4, h5').first();
    let text = headlineEl.text().trim().replace(/\s+/g, ' ');

    if (!text) {
        // Fallback for non-heading elements
        text = $container.text().trim().replace(/\s+/g, ' ');
    }

    // Ensure it's a clickable container
    const isClickable = $container.is('a[href]') || $container.find('a[href]').length > 0 || $container.find('button[data-key]').length > 0;

    if (text && isClickable) {
        return { text };
    }
    return null;
}

export function heuristicallyFindSelectors(html) {
    const $ = cheerio.load(html);
    $(NEGATIVE_TAGS.join(',')).remove();

    const potentialListSelectors = findRepeatingClassSelectors($);
    const clusters = [];

    // Add the CVC-specific selector as a high-priority candidate, as it is a known good pattern.
    potentialListSelectors.unshift('.portfolio__card-holder');

    for (const selector of potentialListSelectors) {
        try {
            const elements = $(selector);
            if (elements.length < 3) continue;

            const samples = [];
            let validItems = 0;

            elements.each((_, el) => {
                const containerData = analyzeContainer($(el));
                if (containerData) {
                    samples.push(containerData.text);
                    validItems++;
                }
            });

            if (validItems > 2 && (validItems / elements.length) > 0.5) {
                clusters.push({
                    selector: selector,
                    score: validItems * (validItems / elements.length),
                    samples: samples,
                });
            }
        } catch (e) {
            // Silently ignore errors from invalid selectors that might still slip through
        }
    }

    if (clusters.length === 0) {
        return [];
    }
    
    const uniqueClusters = [...new Map(clusters.map(item => [item.selector, item])).values()];

    return uniqueClusters.sort((a, b) => b.score - a.score).slice(0, 5);
}
