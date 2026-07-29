import { openai } from "@ai-sdk/openai";

/**
 * 
 * 
 * An LLMs knowledge is frozen at its training cut off.
 * It doesn't know:
 *  - Todays news
 *  - Recent package versions
 *  - Current documentation
 *  - Live data( stock prices, weather, sports scores )
 *  - Anything that happened after training
 * 
 * Web search gives your agent access to current information.
 * It transforms a static knowledge base into a dynamic one
 * 
 * 
 * There are two approaches to web search
 * 
 * 1. Native / Model Provider Web Search
 * 
 * Model providers have built in web search capabilities. The model itself can search and incorporate results
 * OpenAI: uses their Responses API with web_search tool
 * Perplexity: Sonar models have search built in
 * Google Gemini: Search grounding feature
 * 
 * Pros:
 *  - Fast - no extra api calls
 *  - No additional cost (usually)
 *  - Tight integration with the model
 *  - Results are optimized for the model
 * 
 * Cons:
 *  - Only works with specific models/providers
 *  - Less control over search behavior
 *  - Can't customize search sources
 *  - Vendor lock-in
 * 
 * 2 . Tool-Based Web Search
 *  You implement the search as a tool the agent can call. The tool hits a search API(Google, Bing, Exa, Tavily, etc) and returns results
 * 
 * Pros:
 *  - Works with any model that supports 
 *  - Full control over the search params
 *  - Can customize result formatting
 *  - Model agnostic
 * 
 * Cons:
 *  - additional API costs
 *  - Extra latency ( tool calling round trip )
 *  - You handle the result formatting
 *  - Two LLM generations per search (call tool, process results )
 * 
 * FOr production systems, a tool based search might be the best option since it gives you more control.
 */

// Web agents typically follow a two generation pattern
// 1. First generation: Model decides to search, generates tool call with query.
// 2. Search executes: Results returned to model.
// 3. Second generation: Model synthesizes results into a response.
// * Search isn't a single request/response which is why agents need a loop (we built)

/**
 * OpenAI native web search tool
 * 
 * This is a provider tool - execution is handled by OpenAI, not our tool executor
 * Results are returned directly in the models response stream
 */
export const webSearch = openai.tools.webSearch({});