// packages/ai-services/src/lib/langchain.js
import { ChatOpenAI } from "@langchain/openai";
import { env, settings } from "@headlines/config/node";
import { logger } from "@headlines/utils-shared";
import { tokenTracker } from "@headlines/utils-server/node";
import { safeExecute } from "@headlines/utils-server/helpers";
import OpenAI from "openai";
import axios from "axios";

// This function is kept for the pre-flight check
export function validatePromptBraces(promptText, agentName) {
  const singleBraceRegex = /(?<!\{)\{(?!\{)|(?<!\})\}(?!\})/g;
  const match = singleBraceRegex.exec(promptText);
  if (match) {
    const char = match[0];
    const index = match.index;
    const contextSnippet = promptText.substring(
      Math.max(0, index - 30),
      Math.min(promptText.length, index + 30),
    );
    const errorMessage = `\n[PROMPT VALIDATION ERROR] for agent/model '${agentName}'.\nFound a single unpaired curly brace '${char}' at position ${index}.\nAll curly braces in instruction prompts must be doubled (e.g., '{{' and '}}') to be treated as literal text and avoid template errors.\n\nContext:\n..."${contextSnippet}"...\n         ^\n`;
    throw new Error(errorMessage);
  }
}

const modelConfig = { response_format: { type: "json_object" } };

// LangChain model exports - configured for OpenRouter
export const getHeadlineModel = () =>
  new ChatOpenAI({
    modelName: settings.LLM_MODEL_HEADLINE_ASSESSMENT,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY || env.OPENAI_API_KEY,
    },
  }).bind(modelConfig);
export const getHighPowerModel = () =>
  new ChatOpenAI({
    modelName: settings.LLM_MODEL_SYNTHESIS,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY || env.OPENAI_API_KEY,
    },
  }).bind(modelConfig);
export const getUtilityModel = () =>
  new ChatOpenAI({
    modelName: settings.LLM_MODEL_UTILITY,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY || env.OPENAI_API_KEY,
    },
  }).bind(modelConfig);
export const getProModel = () =>
  new ChatOpenAI({
    modelName: settings.LLM_MODEL_PRO,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY || env.OPENAI_API_KEY,
    },
  }).bind(modelConfig);

export const getFallbackModel = () =>
  new ChatOpenAI({
    modelName: settings.LLM_MODEL_FALLBACK || "xiaomi/mimo-v2-flash",
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY || env.OPENAI_API_KEY,
    },
  }).bind(modelConfig);

export function getModelWithFallback(primaryModelName) {
  const fallbackModel = settings.LLM_MODEL_FALLBACK || "xiaomi/mimo-v2-flash";
  return {
    primary: primaryModelName,
    fallback: fallbackModel,
  };
}

// Kimi K2 client for extensive contact enrichment
export const getKimiClient = () => {
  if (!env.KIMI_API_KEY) {
    throw new Error("KIMI_API_KEY is not configured");
  }
  return new OpenAI({
    baseURL: "https://api.moonshot.ai/v1",
    apiKey: env.KIMI_API_KEY,
    timeout: 180 * 1000,
    maxRetries: 3,
  });
};

const KIMI_TOOLS = [
  { type: "function", function: { name: "web_search" } },
  { type: "function", function: { name: "fetch" } },
  { type: "function", function: { name: "rethink" } },
  { type: "function", function: { name: "date" } },
];

async function websearch({ query, numResults = 5 }) {
  const apiKey = env.SERPAPI_KEY;
  if (!apiKey) {
    logger.warn("[WebSearch] No SERPAPI_KEY - using fallback");
    return fallbackSearch(query, numResults);
  }
  
  try {
    const response = await axios.get("https://serpapi.com/search", {
      params: {
        q: query,
        num: numResults,
        api_key: apiKey,
      },
      timeout: 15000,
    });
    
    const results = response.data.organic_results || [];
    return results.map((r) => ({
      title: r.title?.substring(0, 200) || "",
      content: r.snippet?.substring(0, 2000) || r.text?.substring(0, 2000) || "",
    }));
  } catch (e) {
    logger.warn({ err: e, query }, "[SerpAPI] Failed - using fallback");
    return fallbackSearch(query, numResults);
  }
}

async function fallbackSearch(query) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://ddg-api.herokuapp.com/search?q=${encodedQuery}&max_results=5`;
  
  try {
    const response = await axios.get(url, { timeout: 10000 });
    const results = response.data.results || [];
    return results.map((r) => ({
      title: r.title?.substring(0, 200) || "",
      content: r.body?.substring(0, 2000) || "",
    }));
  } catch (e) {
    return [{ title: "", content: `No results for: ${query}` }];
  }
}

async function executeTool(fnName, fnArgs) {
  const query = fnArgs.query || fnArgs.url || "";
  
  if (fnName === "web_search") {
    logger.info(`[WebSearch] Query: "${query}"`);
    try {
      const results = await websearch({ query, numResults: 5 });
      logger.info(`[WebSearch] Found ${results.length} results for: "${query}"`);
      return results.map((r) => r.content?.substring(0, 2000) || r.title || "").join("\n---\n");
    } catch (e) {
      logger.error({ err: e, query }, "[WebSearch] Failed");
      return `Search failed for: ${query}`;
    }
  }
  
  if (fnName === "fetch") {
    logger.info(`[Fetch] URL: "${query}"`);
    try {
      const result = await webfetch({ url: query, format: "text" });
      return result?.substring(0, 4000) || "No content";
    } catch (e) {
      logger.error({ err: e, url: query }, "[Fetch] Failed");
      return `Fetch failed for: ${query}`;
    }
  }
  
  if (fnName === "date") {
    return new Date().toISOString();
  }
  
  return `Unknown tool: ${fnName}`;
}

// Use the official OpenAI client for core, reliable API calls.
const baseClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: env.OPENROUTER_API_KEY || env.OPENAI_API_KEY,
  timeout: 120 * 1000,
  maxRetries: 3,
  defaultHeaders: {
    "HTTP-Referer": "https://headlines.monorepo",
    "X-Title": "Headlines Pipeline",
  },
});

export async function callLanguageModel({
  modelName,
  systemPrompt,
  userContent,
  isJson = true,
  fewShotInputs = [],
  fewShotOutputs = [],
  maxTokens = 2000,
}) {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  fewShotInputs.forEach((input, i) => {
    const shotContent =
      typeof input === "string" ? input : JSON.stringify(input);
    if (shotContent) {
      messages.push({ role: "user", content: shotContent });
      messages.push({ role: "assistant", content: fewShotOutputs[i] });
    }
  });
  messages.push({ role: "user", content: userContent });

  const apiPayload = { model: modelName, messages: messages };
  if (isJson) {
    apiPayload.response_format = { type: "json_object" };
  }
  if (maxTokens) {
    apiPayload.max_tokens = maxTokens;
  }

  const fallbackModel = settings.LLM_MODEL_FALLBACK || "xiaomi/mimo-v2-flash";
  
  const tryCall = async (model) => {
    const payloadWithModel = { ...apiPayload, model };
    try {
      const result = await safeExecute(
        () => baseClient.chat.completions.create(payloadWithModel),
        { timeout: 85000 },
      );
      return { success: true, result, usedModel: model };
    } catch (error) {
      const isRateLimit = error.message && (
        error.message.includes('429') || 
        error.message.includes('rate-limited') ||
        error.status === 429
      );
      return { success: false, error, isRateLimit, usedModel: model };
    }
  };

  let callResult = await tryCall(modelName);
  
  if (!callResult.success && callResult.isRateLimit) {
    logger.warn({ model: modelName, error: callResult.error.message }, '[LangChain] Rate limited, trying fallback');
    callResult = await tryCall(fallbackModel);
    if (callResult.success) {
      logger.info({ model: fallbackModel }, '[LangChain] Using fallback model');
    }
  }

  if (!callResult.success) {
    return { error: callResult.error.message || "API call failed" };
  }

  const result = callResult.result;

  if (!result.choices || result.choices.length === 0) {
    logger.error({ response: result }, `LLM response for model ${callResult.usedModel} had no choices.`);
    return { error: "LLM response had no choices." };
  }

  if (result.usage) tokenTracker.recordUsage(callResult.usedModel, result.usage);

  const responseContent = result.choices[0]?.message?.content;

  if (typeof responseContent !== "string") {
    logger.error(
      { response: result },
      `LLM response for model ${callResult.usedModel} was empty or in an unexpected format.`,
    );
    return { error: "LLM response was empty or invalid." };
  }

  if (isJson) {
    try {
      let jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch)
        throw new Error(
          "No valid JSON object found in the LLM's string response.",
        );

      let parsed = null;
      let attempts = 0;
      let text = jsonMatch[0];

      while (attempts < 5) {
        try {
          parsed = JSON.parse(text);
          break;
        } catch (e) {
          attempts++;
          if (text.startsWith("{") && text.endsWith("}")) {
            text = text.slice(1, -1);
          } else if (text.startsWith("{{") && text.endsWith("}}")) {
            text = "{" + text.slice(2, -2) + "}";
          } else {
            throw e;
          }
        }
      }
      if (parsed === null)
        throw new Error("Could not parse JSON after 5 attempts");
      return parsed;
    } catch (parseError) {
      logger.error(
        { err: parseError, rawContent: responseContent },
        `LLM response JSON Parse Error for model ${callResult.usedModel}`,
      );
      return { error: "JSON Parsing Error" };
    }
  }
  return responseContent;
}

export async function callKimiModel({
  modelName = "kimi-k2-turbo-preview",
  systemPrompt,
  userContent,
  isJson = true,
  fewShotInputs = [],
  fewShotOutputs = [],
  maxToolRounds = 30,
}) {
  const kimClient = getKimiClient();
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  fewShotInputs.forEach((input, i) => {
    const shotContent =
      typeof input === "string" ? input : JSON.stringify(input);
    if (shotContent) {
      messages.push({ role: "user", content: shotContent });
      messages.push({ role: "assistant", content: fewShotOutputs[i] });
    }
  });
  messages.push({ role: "user", content: userContent });

  let rounds = 0;
  while (rounds < maxToolRounds) {
    const apiPayload = {
      model: modelName,
      messages,
      tools: KIMI_TOOLS,
      tool_choice: "auto",
      temperature: 0.6,
      max_tokens: 8192,
    };

    const result = await safeExecute(
      () => kimClient.chat.completions.create(apiPayload),
      { timeout: 180000 },
    );

    if (!result) return { error: "Kimi API call failed or timed out" };

    if (result.usage) tokenTracker.recordUsage(modelName, result.usage);

    const choice = result.choices[0];
    const finish = choice.finish_reason;
    const assistant = choice.message;

    messages.push(assistant);

    if (finish === "tool_calls" && assistant.tool_calls?.length) {
      rounds++;
      logger.info(
        `[Kimi] Round ${rounds}: Tool calls: ${assistant.tool_calls.map((t) => t.function.name).join(", ")}`,
      );

      for (const tc of assistant.tool_calls) {
        const fnName = tc.function.name;
        const fnArgs = tc.function.arguments
          ? JSON.parse(tc.function.arguments)
          : {};

        const result = await executeTool(fnName, fnArgs);
        
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }
      continue;
    }

    if (finish === "stop" || finish === "length") {
      const responseContent = assistant.content ?? "";
      if (isJson) {
        try {
          const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) return JSON.parse(jsonMatch[0]);
          throw new Error("No valid JSON object found");
        } catch (parseError) {
          logger.warn(
            { rawContent: responseContent },
            "Kimi returned non-JSON, returning as text",
          );
          return { text: responseContent, raw: true };
        }
      }
      return responseContent;
    }

    logger.warn(`[Kimi] Unexpected finish_reason: ${finish}`);
    return assistant.content ?? "";
  }

  logger.warn(`[Kimi] Hit maxToolRounds (${maxToolRounds})`);
  return { error: "Max tool rounds exceeded" };
}

export function isKimiConfigured() {
  return !!env.KIMI_API_KEY;
}
