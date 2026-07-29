import { generateText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { extractMessageText } from "./tokenEstimator.ts";

// System msgs are filtered out  ( they're added fresh each turn)
// Conversation is converted to plain text for summarization
// Result is a two-message "seed" that primes the conversation to continue
// The fake assistant response helps maintain conversation flow.

const SUMMMARIZATION_PROMPT = `You are a conversation summarizer . Your task is to create a concise summary of the conversation so far that preserves:

    - Key decisions and conclusions reached
    - Important context and facts mentioned
    - Any pending tasks or questions
    - The overall goal of the conversation
    
Be concise but complete. The summary should allow the conversation to continue naturally.

Conversation to summarize:
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
export async function compactConversation( messages: ModelMessage[], model: string = "gpt-5-mini"): Promise<ModelMessage[]> {
    // Filters out system messages which is handled separately.
    const conversationMessages = messages.filter((m) => m.role !== "system");

    if(conversationMessages.length === 0) {
        return [];
    };

    const conversationText = messagesToText(conversationMessages);

    const { text: summary } = await generateText({
        model: openai(model),
        prompt: SUMMMARIZATION_PROMPT + conversationText
    });

    // Create compacted messages
    const compactedMessages: ModelMessage[] = [
        {
            role: "user",
            content: `[CONVERSATION SUMMARY]\nThe following is a summary of our conversation so far:\n\n${summary}\n\nPlease continue from where we left off.`
        },
        {
            role: "assistant",
            content:
                "I understand. I've reviewed the summary of our conversation and I'm ready to continue. How can I help you next?"
        }
    ]

    return compactedMessages
}