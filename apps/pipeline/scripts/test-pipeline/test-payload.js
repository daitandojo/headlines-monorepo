// scripts/test-pipeline/test-payload.js (version 1.1)
/**
 * This file contains a "known good" test article payload.
 * The --dry-run mode injects this data directly into the pipeline,
 * bypassing the scraping and filtering stages. This ensures a consistent
 * and repeatable test case for the AI assessment, enrichment, clustering,
 * synthesis, and notification preparation stages.
 */
import mongoose from 'mongoose';

export const testArticles = [
  {
    _id: new mongoose.Types.ObjectId(), // DEFINITIVE FIX: Add a synthetic ID for test mode.
    headline:
      'Danish Møller family sells their shipping software company, NaviTech, for $500M to an American buyer.',
    link: 'https://example.com/moller-family-sells-navitech-for-500m',
    source: 'Test Source',
    newspaper: 'Test Source',
    country: 'Denmark',
    articleContent: {
      contents: [
        'COPENHAGEN -- In a landmark deal for the Danish tech sector, the prominent Møller family announced today the successful sale of their privately-held software company, NaviTech, for an estimated $500 million. The buyer is the US-based logistics giant, Global Transport Inc. NaviTech, founded by patriarch Jørgen Møller in 1998, has become a critical player in maritime logistics software. "This is a proud day for our family," said CEO and daughter, Christina Møller. "We built this from the ground up, and we are confident that Global Transport Inc. will take it to the next level. The family plans to focus on philanthropic endeavors through the Møller Foundation going forward."',
      ],
    },
  },
  // You can add more test articles here to test clustering
]
