// apps/pipeline/src/pipeline/1_preflight.js
import { logger } from "@headlines/utils-shared";
import { configure as configureScraperLogic } from "@headlines/scraper-logic/config.js";
import { env, populateSettings, settings } from "@headlines/config";
import { refreshConfig, configStore } from "../config/dynamicConfig.js";
import dbConnect from "@headlines/data-access/dbConnect/node";
import { deleteAllSince } from "@headlines/data-access";
import * as aiServices from "@headlines/ai-services";
import {
  performDatabaseHousekeeping,
  triggerHealingForFailingSources,
} from "../utils/housekeeping.js";
import { configurePush } from "@headlines/scraper-logic/push/client.js";
import { configurePusher, sendGenericEmail } from "@headlines/utils-server";
import { testRedisConnection } from "@headlines/utils-server";
import { Setting, Source } from "@headlines/models";
import * as allPrompts from "@headlines/prompts";
import OpenAI from "openai";

async function sendPipelineFailureAlert(errorMessage, details = {}) {
  const htmlBody = `
    <h2 style="color: #dc2626;">Pipeline Failure Alert</h2>
    <p><strong>Error:</strong> ${errorMessage}</p>
    <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    <p><strong>Details:</strong></p>
    <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${JSON.stringify(details, null, 2)}</pre>
  `;
  try {
    await sendGenericEmail({
      subject: `🚨 Pipeline Failed: ${errorMessage.substring(0, 50)}...`,
      html: htmlBody,
      emailType: "PipelineFailure",
    });
  } catch (e) {
    logger.error({ err: e }, "Failed to send pipeline failure alert email");
  }
}

async function validateApiKeys() {
  logger.info("🔑 Validating all API keys and services...");

  const results = {};
  const failures = [];

  // 1. Kimi K2 (Critical - tested first)
  if (env.KIMI_API_KEY) {
    try {
      const kimiClient = new OpenAI({
        baseURL: "https://api.moonshot.ai/v1",
        apiKey: env.KIMI_API_KEY,
        timeout: 15000,
      });
      await kimiClient.chat.completions.create({
        model: "kimi-k2-turbo-preview",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1,
      });
      results.kimi = { valid: true };
      logger.info("✅ Kimi K2 validated");
    } catch (error) {
      results.kimi = { valid: false, error: error.message };
      failures.push(`Kimi: ${error.message}`);
      logger.error({ err: error }, "❌ Kimi failed");
    }
  } else {
    results.kimi = { valid: false, error: "Not configured" };
    failures.push("Kimi: Not configured (critical for enrichment)");
    logger.error("❌ Kimi not configured (critical for enrichment)");
  }

  // 2. OpenRouter (mimo-v2-flash)
  if (env.OPENROUTER_API_KEY) {
    try {
      const openrouterClient = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: env.OPENROUTER_API_KEY,
        timeout: 15000,
      });
      await openrouterClient.chat.completions.create({
        model: "xiaomi/mimo-v2-flash",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1,
      });
      results.openrouter = { valid: true };
      logger.info("✅ OpenRouter (mimo-v2-flash) validated");
    } catch (error) {
      results.openrouter = { valid: false, error: error.message };
      failures.push(`OpenRouter: ${error.message}`);
      logger.error({ err: error }, "❌ OpenRouter failed");
    }
  } else {
    results.openrouter = { valid: false, error: "Not configured" };
    failures.push("OpenRouter: Not configured");
  }

  // 3. Pinecone
  if (env.PINECONE_API_KEY && env.PINECONE_INDEX_NAME) {
    try {
      const { Pinecone } = await import("@pinecone-database/pinecone");
      const pinecone = new Pinecone({ apiKey: env.PINECONE_API_KEY });
      await pinecone.describeIndex(env.PINECONE_INDEX_NAME);
      results.pinecone = { valid: true };
      logger.info("✅ Pinecone validated");
    } catch (error) {
      results.pinecone = { valid: false, error: error.message };
      failures.push(`Pinecone: ${error.message}`);
      logger.error({ err: error }, "❌ Pinecone failed");
    }
  } else {
    results.pinecone = { valid: false, error: "Not configured" };
    failures.push("Pinecone: Not configured");
  }

  // 4. Redis
  if (env.UPSTASH_REDIS_REST_URL) {
    try {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      });
      await redis.ping();
      results.redis = { valid: true };
      logger.info("✅ Redis validated");
    } catch (error) {
      results.redis = { valid: false, error: error.message };
      logger.warn({ err: error }, "⚠️ Redis failed (optional)");
    }
  } else {
    results.redis = { valid: false, error: "Not configured (optional)" };
    logger.warn("⚠️ Redis not configured (optional)");
  }

  // 5. Serper (Optional)
  if (env.SERPER_API_KEY) {
    try {
      const response = await fetch("https://google.serper.dev/search?q=test", {
        headers: {
          "X-API-KEY": env.SERPER_API_KEY,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      results.serper = { valid: response.ok };
      if (response.ok) logger.info("✅ Serper validated");
      else throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      results.serper = { valid: false, error: error.message };
      logger.warn({ err: error }, "⚠️ Serper failed (optional)");
    }
  } else {
    results.serper = { valid: false, error: "Not configured (optional)" };
    logger.warn("⚠️ Serper not configured (optional)");
  }

  // 6. SMTP (Critical for notifications)
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    try {
      const nodemailerModule = await import("nodemailer");
      const transporter = nodemailerModule.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 465,
        secure: env.SMTP_SECURE === true,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      });
      await transporter.verify();
      results.smtp = { valid: true };
      logger.info("✅ SMTP validated");
    } catch (error) {
      results.smtp = { valid: false, error: error.message };
      logger.warn({ err: error }, "⚠️ SMTP failed (optional)");
    }
  } else {
    results.smtp = { valid: false, error: "Not configured (optional)" };
    logger.warn("⚠️ SMTP not configured (optional)");
  }

  // Summary
  if (failures.length > 0) {
    const errorMsg = `Critical service failures: ${failures.join("; ")}`;
    logger.fatal({ results }, errorMsg);
    await sendPipelineFailureAlert(errorMsg, results);
    throw new Error(errorMsg);
  }

  logger.info("✅ All critical services validated");
  return results;
}

function validatePromptBraces(promptText, promptName) {
  const singleBraceRegex = /(?<!\{)\{(?!\{)|(?<!\})\}(?!\})/g;
  const match = singleBraceRegex.exec(promptText);
  if (match) {
    const char = match[0];
    const index = match.index;
    const contextSnippet = promptText.substring(
      Math.max(0, index - 30),
      Math.min(promptText.length, index + 30),
    );
    const errorMessage = `\n[PROMPT VALIDATION PRE-FLIGHT CHECK FAILED] for prompt '${promptName}'.\nFound a single unpaired curly brace '${char}' at position ${index}.\nAll curly braces in instruction prompts must be doubled (e.g., '{{' and '}}') to be treated as literal text and avoid template errors.\n\nContext:\n..."${contextSnippet}"...\n         ^\n`;
    throw new Error(errorMessage);
  }
}

function validateAllPrompts() {
  logger.info("🔬 Performing prompt syntax validation pre-flight check...");
  function findAndValidateStrings(obj, name) {
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        validatePromptBraces(obj[key], `${name}.${key}`);
      } else if (Array.isArray(obj[key])) {
        obj[key].forEach((item, index) => {
          if (typeof item === "string") {
            validatePromptBraces(item, `${name}.${key}[${index}]`);
          } else if (typeof item === "object" && item !== null) {
            findAndValidateStrings(item, `${name}.${key}[${index}]`);
          }
        });
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        findAndValidateStrings(obj[key], `${name}.${key}`);
      }
    }
  }
  for (const [promptName, promptObject] of Object.entries(allPrompts)) {
    if (promptName.startsWith("shots")) {
      logger.trace(
        `Skipping brace validation for few-shot example file: ${promptName}`,
      );
      continue;
    }
    if (promptObject && typeof promptObject === "object") {
      const content =
        typeof promptObject === "function"
          ? promptObject(settings)
          : promptObject;
      findAndValidateStrings(content, promptName);
    }
  }
  logger.info("✅ All prompts passed syntax validation.");
}

export async function runPreFlightChecks(pipelinePayload) {
  logger.info("--- STAGE 1: PRE-FLIGHT CHECKS & SETUP ---");
  await dbConnect();
  pipelinePayload.dbConnection = true;

  if (pipelinePayload.deleteToday) {
    logger.warn("--- DELETE TODAY MODE ENABLED ---");
    const cutoff = new Date();
    cutoff.setUTCHours(0, 0, 0, 0);
    await deleteAllSince(cutoff);
  }

  try {
    const dbSettings = await Setting.find({}).lean();
    populateSettings(dbSettings);
  } catch (error) {
    logger.fatal(
      { err: error },
      "CRITICAL: Failed to load settings from database. Halting.",
    );
    throw error;
  }

  validateAllPrompts();
  await validateApiKeys();
  await refreshConfig();
  configurePush();
  configurePusher();
  if (!(await testRedisConnection(env))) {
    logger.fatal("Redis pre-flight check failed. Aborting pipeline.");
    return { success: false };
  }

  const utilityFunctions = {
    findAlternativeSources: aiServices.findAlternativeSources,
    findNewsApiArticlesForEvent: aiServices.findNewsApiArticlesForEvent,
    performGoogleSearch: aiServices.performGoogleSearch,
    fetchWikipediaSummary: aiServices.fetchWikipediaSummary,
  };
  configureScraperLogic({
    ...env,
    paths: pipelinePayload.paths,
    configStore,
    utilityFunctions,
    logger,
    settings,
  });

  if (!(await aiServices.performAiSanityCheck(settings))) {
    logger.fatal("AI service checks failed. Aborting pipeline.");
    return { success: false };
  }

  await performDatabaseHousekeeping();

  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 0) {
    await triggerHealingForFailingSources();
  }

  // --- START OF MODIFICATION ---
  logger.info("Validating source filters and fetching sources to scrape...");
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const baseQuery = {
    status: "active",
    $or: [
      { scrapeFrequency: "high" },
      { scrapeFrequency: "low", lastScrapedAt: { $lt: twentyFourHoursAgo } },
      { scrapeFrequency: "low", lastScrapedAt: { $exists: false } },
    ],
  };
  const queryCriteria = { ...baseQuery };

  if (pipelinePayload.countryFilter) {
    queryCriteria.country = new RegExp(
      `^${pipelinePayload.countryFilter}$`,
      "i",
    );
    delete queryCriteria.$or;
  }
  if (pipelinePayload.sourceFilter) {
    // Use a case-insensitive regex for the filter
    queryCriteria.name = new RegExp(`^${pipelinePayload.sourceFilter}$`, "i");
    delete queryCriteria.$or;
  }

  const sourcesToScrape = await Source.find(queryCriteria).lean();

  // If a specific filter was provided but no sources were found, it's a fatal error.
  if (
    sourcesToScrape.length === 0 &&
    (pipelinePayload.countryFilter || pipelinePayload.sourceFilter)
  ) {
    const filterKey = pipelinePayload.sourceFilter ? "source" : "country";
    const filterValue =
      pipelinePayload.sourceFilter || pipelinePayload.countryFilter;
    const errorMessage = `PRE-FLIGHT FAILED: The specified filter (--${filterKey} "${filterValue}") matched 0 active sources. Halting run. Please check for typos.`;
    logger.fatal(errorMessage);
    throw new Error(errorMessage);
  }

  logger.info(
    `Pre-flight check passed. Found ${sourcesToScrape.length} sources to process.`,
  );
  pipelinePayload.sourcesToScrape = sourcesToScrape;
  // --- END OF MODIFICATION ---

  return { success: true, payload: pipelinePayload };
}
