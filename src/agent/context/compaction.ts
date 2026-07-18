import { generateText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { extractMessageText } from "./tokenEstimator.ts";

const SUMMMARIZATION_PROMPT = `
`;

/**
 * Format messages array as readable text for summarization
 */
function messagesToText(messages: ModelMessage[]): string {
    return messages
        .map((msg) => {
            const role = msg.role.toUpperCase();
            const content = extractMessageText(msg);
            return `[${role}]: ${content}`;
        })
        .join("\n\n");
}

/**
 * Compact a conversation by summarizing it with an LLM
 * 
 * Takes the current messages (excluding system prompt)
 * returns a new messages array with:
 *  - A user message containing summary
 *  - An assistant acknowledgement
 *  
 * The system prompt should be prepended by the caller
 */
export async function compactConversation( messages: ModelMessage[], model: string = "gpt-5-mini"): Promise<any> {
    // Filters out system messages which is handled separately.
}