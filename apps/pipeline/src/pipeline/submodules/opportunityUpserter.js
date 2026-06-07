// packages/pipeline/src/pipeline/submodules/opportunityUpserter.js
import {
  Opportunity,
  SynthesizedEvent,
  WatchlistEntity,
} from "@headlines/models";
import { logger } from "@headlines/utils-shared";
import {
  contactFinderChain,
  entityCanonicalizerChain,
  generateEmbedding,
  opportunityChain,
  dossierUpdateChain,
  extensiveEnrichmentChain,
  isKimiConfigured,
  findExistingByNameOrCreate,
  enrichOpportunityWithPriority,
} from "@headlines/ai-services";
import { getConfig } from "@headlines/scraper-logic/config.js";
import { truncateString } from "@headlines/utils-shared";
import { settings } from "@headlines/config";
import mongoose from "mongoose";

function sanitizeForJSON(obj) {
  if (obj === null || obj === undefined) return obj;
  if (obj._bsontype === "ObjectId" || obj.constructor?.name === "ObjectId")
    return obj.toString();
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map((item) => sanitizeForJSON(item));
  if (typeof obj === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeForJSON(value);
    }
    return sanitized;
  }
  return obj;
}

async function selfCorrectWatchlist(opportunityName, canonicalName) {
  if (opportunityName.toLowerCase() === canonicalName.toLowerCase()) return;
  try {
    const watchlistEntity = await WatchlistEntity.findOne({
      name: canonicalName,
    });
    if (!watchlistEntity) return;
    const newSearchTerm = opportunityName.toLowerCase().trim();
    if (!watchlistEntity.searchTerms.includes(newSearchTerm)) {
      watchlistEntity.searchTerms.push(newSearchTerm);
      await watchlistEntity.save();
      logger.info(
        `[Self-Correct] Added search term '${newSearchTerm}' to watchlist entity '${canonicalName}'`,
      );
    }
  } catch (error) {
    logger.error({ err: error }, "[Self-Correct] Failed to update watchlist");
  }
}

function generateContactSearchQueries(person) {
  const queries = [`"${person.reachOutTo}" contact information`];
  if (person.contactDetails?.company) {
    queries.unshift(
      `"${person.reachOutTo}" ${person.contactDetails.company} email address`,
    );
  }
  return queries;
}

async function performContactSearches(queries, utilityFunctions) {
  let combinedSnippets = "";
  for (const query of queries) {
    try {
      const searchResult = await utilityFunctions.performGoogleSearch(query);
      if (searchResult.success && searchResult.snippets) {
        combinedSnippets += `\n--- Results for query: "${query}" ---\n${searchResult.snippets}`;
      }
    } catch (error) {
      logger.warn({ err: error, query }, "[Contact Research] Search failed");
    }
  }
  return combinedSnippets;
}

async function findContactEmail(person) {
  const config = getConfig();
  logger.info(`[Contact Research] Initiated for: ${person.reachOutTo}`);
  try {
    const queries = generateContactSearchQueries(person);
    const combinedSnippets = await performContactSearches(
      queries,
      config.utilityFunctions,
    );
    if (!combinedSnippets) {
      logger.warn(
        `[Contact Research] No search results for "${person.reachOutTo}".`,
      );
      return null;
    }
    const response = await contactFinderChain({ snippets: combinedSnippets });
    if (response.error || !response.email) {
      logger.warn(
        `[Contact Research] LLM failed to extract email for "${person.reachOutTo}".`,
      );
      return null;
    }
    logger.info(
      { email: response.email },
      `[Contact Research] Found email for "${person.reachOutTo}"`,
    );
    return response.email;
  } catch (error) {
    logger.error(
      { err: error, person: person.reachOutTo },
      "[Contact Research] Failed to find contact email",
    );
    return null;
  }
}

function buildIndividualsMapFromOpportunities(opportunities, savedEvents) {
  const individualsMap = new Map();
  for (const opp of opportunities) {
    const matchingEvent = savedEvents.find(
      (e) => e.event_key === opp.event_key,
    );
    if (matchingEvent) {
      const normalizedName = opp.reachOutTo.toLowerCase();
      individualsMap.set(normalizedName, {
        name: opp.reachOutTo,
        event: matchingEvent,
      });
    }
  }
  return individualsMap;
}

function addIndividualsFromEvents(savedEvents, existingMap) {
  for (const event of savedEvents) {
    for (const individual of event.key_individuals || []) {
      const normalizedName = individual.name.toLowerCase();
      if (!existingMap.has(normalizedName)) {
        existingMap.set(normalizedName, {
          name: individual.name,
          event: event,
        });
      }
    }
  }
  return existingMap;
}

async function fetchExistingOpportunities(names) {
  if (names.length === 0) return new Map();
  const existingOpportunities = await Opportunity.find({
    reachOutTo: { $in: names },
  }).lean();
  logger.info(
    `Found ${existingOpportunities.length} existing Opportunity profiles for ${names.length} unique individuals`,
  );
  return new Map(
    existingOpportunities.map((o) => [o.reachOutTo.toLowerCase(), o]),
  );
}

function buildIntelligenceText(event) {
  return `Event Key: ${event.event_key}\nSynthesized Event Headline: ${event.synthesized_headline}\nSynthesized Event Summary: ${event.synthesized_summary}`;
}

// --- START OF DEFINITIVE FIX ---
// The previous logic used a complex AI chain to merge JSON, which was slow and caused timeouts.
// This new hybrid approach is faster and more reliable.
async function updateExistingOpportunity(name, existingProfile, event) {
  logger.info(
    `[Hybrid Dossier Update] Updating existing profile for ${name} with new event info...`,
  );
  try {
    // Step 1: Deterministic Merge for structured data
    const updatedOpp = { ...existingProfile };
    updatedOpp.whyContact = [
      ...new Set([
        ...(updatedOpp.whyContact || []),
        buildIntelligenceText(event),
      ]),
    ];
    updatedOpp.events = [
      ...new Set([
        ...(updatedOpp.events || []).map(String),
        event._id.toString(),
      ]),
    ];
    updatedOpp.lastKnownEventLiquidityMM = Math.max(
      updatedOpp.lastKnownEventLiquidityMM || 0,
      event.transactionDetails?.liquidityFlow?.approxAmountUSD || 0,
    );

    // Step 2: Use AI ONLY for unstructured text synthesis (the biography)
    if (existingProfile.profile?.biography) {
      const dossierUpdateInput = {
        existing_dossier_json: JSON.stringify({
          biography: existingProfile.profile.biography,
        }),
        new_intelligence_text: buildIntelligenceText(event),
      };
      const result = await dossierUpdateChain(dossierUpdateInput);
      if (
        result &&
        !result.error &&
        result.opportunities?.[0]?.profile?.biography
      ) {
        updatedOpp.profile.biography =
          result.opportunities[0].profile.biography;
        logger.info(
          `  -> AI successfully synthesized new biography for ${name}.`,
        );
      } else {
        logger.warn(
          `  -> AI biography synthesis failed for ${name}. Appending new info manually.`,
        );
        updatedOpp.profile.biography += `\n\nUpdate (${new Date().toISOString()}): ${buildIntelligenceText(event)}`;
      }
    }

    updatedOpp.event_key = event.event_key;
    return updatedOpp;
  } catch (error) {
    logger.error(
      { err: error, name, eventKey: event.event_key },
      "[Hybrid Dossier Update] Failed to update opportunity",
    );
    return null;
  }
}
// --- END OF DEFINITIVE FIX ---

async function createNewOpportunity(name, event) {
  logger.info(`[Opportunity Agent] Creating new profile for ${name}...`);
  try {
    const intelligenceText = buildIntelligenceText(event);
    const opportunityInput = {
      context_text: intelligenceText,
      existing_wealth_profile: null,
    };
    const opportunityResult = await opportunityChain(opportunityInput);
    if (
      opportunityResult &&
      opportunityResult.opportunities &&
      opportunityResult.opportunities.length > 0
    ) {
      const opps = opportunityResult.opportunities
      const enriched = await enrichOpportunityWithPriority(opps[0], event)
      return [enriched]
    }
    logger.warn(`[Opportunity Agent] Failed to create profile for ${name}`);
    return [];
  } catch (error) {
    logger.error(
      { err: error, name, eventKey: event.event_key },
      "[Opportunity Agent] Failed to create opportunity",
    );
    return [];
  }
}

async function createNewOpportunitiesFromDiscovery(discoveredOpportunities) {
  const createdOpps = [];

  for (const discOpp of discoveredOpportunities) {
    if (!discOpp.name) continue;

    logger.info(`[Discovery] Creating opportunity for: ${discOpp.name}`);

    const intelligenceText = `Discovered through enrichment of ${discOpp.parent || "unknown"}. Relationship: ${discOpp.relationship}.`;

    const opportunityInput = {
      context_text: intelligenceText,
      existing_wealth_profile: null,
    };

    try {
      const result = await opportunityChain(opportunityInput);
      if (result && result.opportunities && result.opportunities.length > 0) {
        const newOpp = result.opportunities[0];
        newOpp.reachOutTo = discOpp.name;
        newOpp.contactDetails = {
          role: discOpp.role,
          company: discOpp.company,
          email: discOpp.email,
        };
        newOpp.basedIn = discOpp.location ? [discOpp.location] : [];
        if (discOpp.estimatedNetWorthMM) {
          newOpp.profile = { estimatedNetWorthMM: discOpp.estimatedNetWorthMM };
        }
        newOpp.relatedIndividuals = [
          {
            name: discOpp.parent,
            relationship: discOpp.relationship,
            type: "parent_connection",
          },
        ];
        createdOpps.push(newOpp);
      }
    } catch (error) {
      logger.error(
        { err: error, name: discOpp.name },
        "[Discovery] Failed to create opportunity",
      );
    }
  }

  return createdOpps;
}

async function savePendingTransactions(pendingTransactions) {
  const { PendingTransaction } = await import("@headlines/models");

  for (const tx of pendingTransactions) {
    try {
      await PendingTransaction.findOneAndUpdate(
        { event_key: tx.event_key },
        { ...tx, createdAt: new Date() },
        { upsert: true },
      );
      logger.info(`[Pending] Saved: ${tx.company} - ${tx.status}`);
    } catch (error) {
      logger.error({ err: error, tx }, "[Pending] Failed to save transaction");
    }
  }
}

async function generateOpportunities(individualsMap, existingOppMap) {
  const allGeneratedOpportunities = [];
  for (const { name, event } of individualsMap.values()) {
    const existingProfile = existingOppMap.get(name.toLowerCase()) || null;
    let opportunities;
    if (existingProfile) {
      const updated = await updateExistingOpportunity(
        name,
        existingProfile,
        event,
      );
      opportunities = updated ? [updated] : [];
    } else {
      opportunities = await createNewOpportunity(name, event);
    }
    if (opportunities.length > 0) {
      allGeneratedOpportunities.push(...opportunities);
    }
  }
  return allGeneratedOpportunities;
}

async function canonicalizeOpportunityNames(opportunities) {
  return Promise.all(
    opportunities.map(async (opp) => {
      try {
        const originalName = opp.reachOutTo;
        const response = await entityCanonicalizerChain({
          entity_name: originalName,
        });
        if (response && !response.error && response.canonical_name) {
          opp.reachOutTo = response.canonical_name;
          await selfCorrectWatchlist(originalName, response.canonical_name);
        }
      } catch (error) {
        logger.warn(
          { err: error, name: opp.reachOutTo },
          "[Canonicalization] Failed to canonicalize name",
        );
      }
      return opp;
    }),
  );
}

async function enrichWithContactEmails(opportunities) {
  return Promise.all(
    opportunities.map(async (opp) => {
      if (!opp.contactDetails?.email) {
        try {
          const email = await findContactEmail(opp);
          if (email) {
            opp.contactDetails.email = email;
          }
        } catch (error) {
          logger.warn(
            { err: error, name: opp.reachOutTo },
            "[Contact Enrichment] Failed to find email",
          );
        }
      }
      return opp;
    }),
  );
}

async function createOpportunityFromEnrichment(
  person,
  parentName,
  relationshipType,
) {
  const lookupResult = await findExistingByNameOrCreate(person.full_name, {
    role: person.role,
    company: person.company,
    location: person.location,
  });

  if (lookupResult.exists) {
    logger.info(`[RAG Lookup] Merging with existing: ${person.full_name}`);
    return {
      ...lookupResult,
      isNew: false,
      relationship: relationshipType,
      parent: parentName,
    };
  }

  logger.info(`[RAG Lookup] Creating new opportunity: ${person.full_name}`);
  return {
    isNew: true,
    name: person.full_name,
    role: person.role || null,
    company: person.company || null,
    location: person.location || null,
    estimatedNetWorthMM: parseNetWorth(person.estimated_networth),
    email: person.email || null,
    relationship: relationshipType,
    parent: parentName,
    sourceEvent: null,
  };
}

function parseNetWorth(networthStr) {
  if (!networthStr) return null;
  const match = networthStr.match(/[\d,.]+/);
  if (!match) return null;
  const num = parseFloat(match[0].replace(/,/g, ""));
  if (
    networthStr.toLowerCase().includes("b") ||
    networthStr.includes("€") ||
    networthStr.includes("$")
  ) {
    return num * 1000;
  }
  return num;
}

async function enrichWithExtensiveWealthData(opportunities, existingOppMap) {
  if (!isKimiConfigured()) {
    logger.info("[Extensive Enrichment] Kimi not configured, skipping");
    return { opportunities, newOpportunities: [] };
  }

  logger.info(
    `[Extensive Enrichment] Starting for ${opportunities.length} opportunities`,
  );

  const allNewOpportunities = [];
  const pendingTransactions = [];

  for (const opp of opportunities) {
    // Skip deep wealth research for excluded entities (globally-famous noise)
    const { isExcluded } = await import('../../utils/enrichmentExclusions.js')
    if (await isExcluded(opp.reachOutTo)) {
      logger.info(`[Extensive Enrichment] Skipping ${opp.reachOutTo} — excluded entity`)
      continue
    }

    const existing = existingOppMap?.get(opp.reachOutTo.toLowerCase());
    const currentContext = existing?.profile?.biography
      ? JSON.stringify({ biography: existing.profile.biography })
      : null;

    const enrichmentInput = {
      name: opp.reachOutTo,
      company: opp.contactDetails?.company,
      currentContext,
      country: opp.basedIn?.[0] || null,
    };

    try {
      const result = await extensiveEnrichmentChain(enrichmentInput);
      if (result && !result.error && result.extensive_enrichment) {
        const enrichment = result.extensive_enrichment;

        if (enrichment.seed_person?.family_office) {
          opp.profile = opp.profile || {};
          opp.profile.familyOfficeName = enrichment.seed_person.family_office;
          if (opp.accessPath) {
            opp.accessPath.familyOffice = enrichment.seed_person.family_office
          }
        }

        // Process family members - each becomes their own opportunity
        if (enrichment.family_members?.length > 0) {
          for (const member of enrichment.family_members) {
            if (!member.full_name) continue;
            const newOpp = await createOpportunityFromEnrichment(
              member,
              opp.reachOutTo,
              "family",
            );
            if (newOpp.isNew) {
              allNewOpportunities.push(newOpp);
            }
            opp.relatedIndividuals = opp.relatedIndividuals || [];
            if (
              !opp.relatedIndividuals.some(
                (r) =>
                  r.name?.toLowerCase() === member.full_name?.toLowerCase(),
              )
            ) {
              opp.relatedIndividuals.push({
                name: member.full_name,
                relationship: member.relationship,
                role: member.role,
                type: "family",
                linkedOppId: newOpp.id || null,
              });
            }
          }
        }

        // Process business peers - each becomes their own opportunity
        if (enrichment.business_peers?.length > 0) {
          for (const peer of enrichment.business_peers) {
            if (!peer.full_name) continue;
            const newOpp = await createOpportunityFromEnrichment(
              peer,
              opp.reachOutTo,
              "peer",
            );
            if (newOpp.isNew) {
              allNewOpportunities.push(newOpp);
            }
            opp.relatedIndividuals = opp.relatedIndividuals || [];
            if (
              !opp.relatedIndividuals.some(
                (r) => r.name?.toLowerCase() === peer.full_name?.toLowerCase(),
              )
            ) {
              opp.relatedIndividuals.push({
                name: peer.full_name,
                role: peer.role,
                company: peer.company,
                type: "peer",
                linkedOppId: newOpp.id || null,
              });
            }
          }
        }

        // Process related wealthy - each becomes their own opportunity
        if (enrichment.related_wealthy?.length > 0) {
          for (const related of enrichment.related_wealthy) {
            if (!related.full_name) continue;
            const newOpp = await createOpportunityFromEnrichment(
              { ...related, location: related.location },
              opp.reachOutTo,
              "related_wealth",
            );
            if (newOpp.isNew) {
              allNewOpportunities.push(newOpp);
            }
            opp.relatedIndividuals = opp.relatedIndividuals || [];
            if (
              !opp.relatedIndividuals.some(
                (r) =>
                  r.name?.toLowerCase() === related.full_name?.toLowerCase(),
              )
            ) {
              opp.relatedIndividuals.push({
                name: related.full_name,
                relationship: related.connection,
                type: "related_wealth",
                linkedOppId: newOpp.id || null,
              });
            }
          }
        }

        // Capture pending transactions
        if (enrichment.pending_transactions?.length > 0) {
          for (const tx of enrichment.pending_transactions) {
            if (!tx.company) continue;
            pendingTransactions.push({
              company: tx.company,
              status: tx.status,
              announcedDate: tx.announced_date,
              estimatedValue: tx.estimated_value,
              parties: tx.parties,
              source: tx.source,
              relatedTo: opp.reachOutTo,
              event_key: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            });
          }
        }

        logger.info(`[Extensive Enrichment] Completed for ${opp.reachOutTo}`);
      } else {
        logger.warn(`[Extensive Enrichment] No result for ${opp.reachOutTo}`);
      }
    } catch (error) {
      logger.warn(
        { err: error, name: opp.reachOutTo },
        "[Extensive Enrichment] Failed",
      );
    }
  }

  logger.info(
    `[Extensive Enrichment] Found ${allNewOpportunities.length} new people, ${pendingTransactions.length} pending transactions`,
  );
  return {
    opportunities,
    newOpportunities: allNewOpportunities,
    pendingTransactions,
  };
}

function buildEmbeddingText(opp) {
  const textParts = [
    opp.reachOutTo,
    ...(Array.isArray(opp.whyContact) ? opp.whyContact : [opp.whyContact]),
    opp.contactDetails?.company,
    opp.profile?.wealthOrigin,
    opp.profile?.biography,
    ...(opp.profile?.investmentInterests || []),
  ];
  return textParts.filter(Boolean).join("; ");
}

async function generateOpportunityEmbeddings(opportunities) {
  return Promise.all(
    opportunities.map(async (opp) => {
      try {
        const textToEmbed = buildEmbeddingText(opp);
        const embedding = await generateEmbedding(textToEmbed);
        return { ...opp, embedding };
      } catch (error) {
        logger.warn(
          { err: error, name: opp.reachOutTo },
          "[Embedding] Failed to generate embedding",
        );
        return opp;
      }
    }),
  );
}

function buildOpportunityUpdateOperation(opp) {
  const { createdAt, updatedAt, __v, _id, reachOutTo, ...restOfOpp } = opp;
  const update = {
    $setOnInsert: { reachOutTo: opp.reachOutTo, createdAt: new Date() },
    $set: {},
    $addToSet: {},
    $max: {},
  };
  for (const [key, value] of Object.entries(restOfOpp)) {
    if (value === null || value === undefined) continue;
    switch (key) {
      case "whyContact":
      case "events":
        if (Array.isArray(value) && value.length > 0) {
          update.$addToSet[key] = {
            $each: value.map((v) =>
              mongoose.Types.ObjectId.isValid(v)
                ? new mongoose.Types.ObjectId(v)
                : v,
            ),
          };
        }
        break;
      case "lastKnownEventLiquidityMM":
        update.$max[key] = value;
        break;
      case "profile":
        if (typeof value === "object" && value !== null) {
          const { estimatedNetWorthMM, ...otherProfileFields } = value;
          for (const [profKey, profVal] of Object.entries(otherProfileFields)) {
            if (profVal !== null && profVal !== undefined) {
              update.$set[`profile.${profKey}`] = profVal;
            }
          }
          if (
            estimatedNetWorthMM !== null &&
            estimatedNetWorthMM !== undefined
          ) {
            update.$max["profile.estimatedNetWorthMM"] = estimatedNetWorthMM;
          }
        }
        break;
      default:
        update.$set[key] = value;
        break;
    }
  }
  if (Object.keys(update.$set).length === 0) delete update.$set;
  if (Object.keys(update.$addToSet).length === 0) delete update.$addToSet;
  if (Object.keys(update.$max).length === 0) delete update.$max;
  return {
    updateOne: {
      filter: { reachOutTo: opp.reachOutTo },
      update,
      upsert: true,
    },
  };
}

async function upsertOpportunities(opportunities) {
  if (opportunities.length === 0) return [];
  try {
    const bulkOps = opportunities.map(buildOpportunityUpdateOperation);
    await Opportunity.bulkWrite(bulkOps, { ordered: false });
    logger.info(
      `Successfully sent ${opportunities.length} upsert operations to database.`,
    );
    const names = opportunities.map((o) => o.reachOutTo);
    const savedDocs = await Opportunity.find({
      reachOutTo: { $in: names },
    }).lean();
    logger.info(
      `Successfully fetched ${savedDocs.length} upserted opportunities from database.`,
    );
    return savedDocs;
  } catch (error) {
    logger.error({ err: error }, "[Upsert] Failed to upsert opportunities");
    throw error;
  }
}

function buildOpportunityIdMap(opportunities) {
  return new Map(opportunities.map((o) => [o.reachOutTo.toLowerCase(), o._id]));
}

function createLinkOperations(savedEvents, opportunityIdMap) {
  const eventLinkOps = [];
  const oppLinkOps = [];
  for (const event of savedEvents) {
    for (const individual of event.key_individuals || []) {
      const opportunityId = opportunityIdMap.get(individual.name.toLowerCase());
      if (opportunityId) {
        eventLinkOps.push({
          updateOne: {
            filter: { _id: event._id },
            update: { $addToSet: { relatedOpportunities: opportunityId } },
          },
        });
        oppLinkOps.push({
          updateOne: {
            filter: { _id: opportunityId },
            update: { $addToSet: { events: event._id } },
          },
        });
      }
    }
  }
  return { eventLinkOps, oppLinkOps };
}

async function linkOpportunitiesAndEvents(savedEvents, opportunities) {
  if (opportunities.length === 0) {
    logger.info("[Linking] No opportunities to link to events");
    return;
  }
  try {
    const opportunityIdMap = buildOpportunityIdMap(opportunities);
    const { eventLinkOps, oppLinkOps } = createLinkOperations(
      savedEvents,
      opportunityIdMap,
    );
    if (oppLinkOps.length > 0) {
      await Promise.all([
        Opportunity.bulkWrite(oppLinkOps, { ordered: false }),
        SynthesizedEvent.bulkWrite(eventLinkOps, { ordered: false }),
      ]);
      logger.info(
        `Successfully linked ${oppLinkOps.length} relationships between events and opportunities`,
      );
    } else {
      logger.info("[Linking] No new relationships to link");
    }
  } catch (error) {
    logger.error(
      { err: error },
      "[Linking] Failed to link opportunities and events",
    );
  }
}

export async function enrichAndLinkOpportunities(
  potentialOpportunities,
  savedEvents,
  options = {},
) {
  const { emitter } = options
  const allOps = []
  let finalOppDocs

  logger.trace(
    {
      potentialOpportunities: (potentialOpportunities || []).map(
        (o) => o.reachOutTo,
      ),
      savedEvents: (savedEvents || []).map((e) => e.event_key),
    },
    "enrichAndLinkOpportunities received",
  );

  if (!Array.isArray(savedEvents) || savedEvents.length === 0) {
    logger.warn(
      "[CRITICAL] No saved events provided to enrichAndLinkOpportunities. Cannot process opportunities.",
    );
    return [];
  }

  const individualsMap = buildIndividualsMapFromOpportunities(
    potentialOpportunities,
    savedEvents,
  );
  addIndividualsFromEvents(savedEvents, individualsMap);

  if (individualsMap.size === 0) {
    logger.info(
      "No key individuals found in approved events. Skipping opportunity creation.",
    );
    return [];
  }

  logger.info(
    `Identified ${individualsMap.size} unique individuals for processing`,
  );

  const names = Array.from(individualsMap.values()).map((p) => p.name);
  const existingOppMap = await fetchExistingOpportunities(names);

  const generatedOpportunities = await generateOpportunities(
    individualsMap,
    existingOppMap,
  );

  finalOppDocs = []

  if (generatedOpportunities.length === 0) {
    logger.info(
"AI Agents generated no new or updated opportunities. Linking events to existing profiles.",
    )
    finalOppDocs = Array.from(existingOppMap.values())
  } else {
    logger.info(
      `AI Agents generated/updated ${generatedOpportunities.length} opportunities for processing`,
    );

    const canonicalizedOpportunities = await canonicalizeOpportunityNames(
      generatedOpportunities,
    );
    const enrichedOpportunities = await enrichWithContactEmails(
      canonicalizedOpportunities,
    );
    const {
      opportunities: extensivelyEnrichedOpportunities,
      newOpportunities,
      pendingTransactions,
    } = await enrichWithExtensiveWealthData(
      enrichedOpportunities,
      existingOppMap,
    );

    // Process new opportunities discovered through enrichment
    let allOpportunitiesToUpsert = extensivelyEnrichedOpportunities;
    if (newOpportunities.length > 0) {
      logger.info(
        `[Enrichment] Processing ${newOpportunities.length} new discovered opportunities`,
      );
      const newOppDocs =
        await createNewOpportunitiesFromDiscovery(newOpportunities);
      allOpportunitiesToUpsert = [
        ...extensivelyEnrichedOpportunities,
        ...newOppDocs,
      ];
    }

    // Save pending transactions
    if (pendingTransactions.length > 0) {
      await savePendingTransactions(pendingTransactions);
    }

    const opportunitiesWithEmbeddings = await generateOpportunityEmbeddings(
      allOpportunitiesToUpsert,
    )
    finalOppDocs = await upsertOpportunities(opportunitiesWithEmbeddings)
  }

  if (emitter && finalOppDocs.length > 0) {
    for (const opp of finalOppDocs) {
      if (opp && opp.reachOutTo) {
        emitter.opportunityCreated(opp)
      }
    }
  }

  await linkOpportunitiesAndEvents(savedEvents, finalOppDocs)

  logger.info(
    `[Enrichment Complete] Returning ${finalOppDocs.length} opportunity documents`,
  )

  return finalOppDocs
}
