// Basic agent runner

import { generateText, streamText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { LaminarAiSdkTelemetry, registerAiSdkTelemetry } from "@lmnr-ai/lmnr"
import { registerTelemetry } from "ai";
import { SYSTEM_PROMPT } from "./system/prompts.ts"

import type { AgentCallbacks, ToolCallInfo } from "../types.ts";

import { tools } from "./tools/index.ts";
import { executeTool } from "./executeTool.ts";
import { filterCompatibleMessages } from "./system/filterMessages.ts";

import {
    estimateMessagesTokens,
    getModelLimits,
    isOverThreshold,
    calculateusagePercentage,
    compactConversation,
    DEFAULT_THRESHOLD,

} from "./context/index.ts"

const model = "gpt-5-mini";

// Laminar.initialize()
// registerAiSdkTelemetry(); // inits Laminar and calls Laminar.initalize

registerTelemetry(
    new LaminarAiSdkTelemetry({
        laminarOptions: { projectApiKey: process.env.LMNR_PROJECT_API_KEY }
    })
)

export async function runAgent( userMessage: string, conversationHistory: ModelMessage[], callbacks: AgentCallbacks): Promise<ModelMessage[]> {
    
    const modelLimits = getModelLimits(model);

    // Filter and check if we need to compact the conversation history before starting
    let workingHistory = filterCompatibleMessages(conversationHistory);

    const preCheckTokens = estimateMessagesTokens([
        {
            role: "system",
            content: SYSTEM_PROMPT
        },
        ...workingHistory,
        {
            role: "user",
            content: userMessage
        }
    ])

    if (isOverThreshold(preCheckTokens.total, modelLimits.contextWindow)) {
        // Compact conversation
        workingHistory = await compactConversation(workingHistory, model);
    }


    const messages: ModelMessage[] = [
        // {
        //     role: "system", content: SYSTEM_PROMPT
        // }, // CHANGED TO CONVERSATIONAL MESSAGES
        ...workingHistory,
        {
            role: "user", content: userMessage
        },
    ];

    let fullResponse = "";

    // Report initial token usage
    const reportTokenUsage = () => {
        if(callbacks.onTokenUsage) {
            const usage = estimateMessagesTokens(messages);
            callbacks.onTokenUsage({
                inputTokens: usage.input,
                outputTokens: usage.output,
                totalTokens: usage.total,
                contextWindow: modelLimits.contextWindow,
                threshold: DEFAULT_THRESHOLD,
                percentage: calculateusagePercentage(
                    usage.total,
                    modelLimits.contextWindow
                ),
            });
        }
    }


    // We call this function after each significant change to messages
    // - After adding response messages
    // - After adding tool results
    reportTokenUsage()

    

    while(true) {
        const result = streamText({
            model: openai(model),
            instructions: SYSTEM_PROMPT, // passed system prompt via instructions since it could no longer be in the messages.
            messages,
            tools,
            telemetry: {
                isEnabled: true,
            }
            
        });

        const toolCalls: ToolCallInfo[] = [];
        let currentText = "";
        let streamError: Error | null = null;

        try {
            // fullstream deprecated
            for await(const chunk of result.stream) {
                if(chunk.type === "text-delta") {
                    currentText += chunk.text;
                    callbacks.onToken(chunk.text)
                }
                if(chunk.type === "tool-call") {
                    const input = "input" in chunk ? chunk.input : {};
                    toolCalls.push({
                        toolCallId: chunk.toolCallId,
                        toolName: chunk.toolName,
                        args: input as Record<string, unknown>
                    })
                    callbacks.onToolCallStart(chunk.toolName, input);
                }
            }
        } catch (error) {
            streamError = error as Error;
            // If we have some text, continue processing
            // Otherwise, rethrow if it's not a "no output" error
            if( !currentText && !streamError.message.includes("No output generated")) {
                throw streamError;
            }

        }
        fullResponse += currentText;

        //If stream errored with "no output" and we have no text, try to recover
        if (streamError && !currentText) {
            // Add a fallback response
            fullResponse = "I apologize but I wasn't able to generate a response. Could you please try rephrasing your message";
            callbacks.onToken(fullResponse);
            break;
        }

        const finishReason = await result.finishReason;

        if(finishReason !== "tool-calls" || toolCalls.length === 0) {
            const responseMessages = await result.response; // .response is deprecated
            messages.push(...responseMessages.messages);
            reportTokenUsage();
            break;
        }

        const responseMessages = await result.response;
        messages.push(...responseMessages.messages);
        reportTokenUsage();

        // Process tool calls sequentially with approval for each
        let rejected = false;


        for( const tc of toolCalls) {

            const approved = await callbacks.onToolApproval(tc.toolName, tc.args)

            if(!approved) {
                rejected = true;
                break;
            }
            
            const result = await executeTool(tc.toolName, tc.args);
            callbacks.onToolCallEnd(tc.toolName, result);

            messages.push({
                role: "tool",
                content: [
                    {
                        type: "tool-result",
                        toolCallId: tc.toolCallId,
                        toolName: tc.toolName,
                        output:  { type: "text", value: result }
                    },
                ]
            }),
            reportTokenUsage()
        }
        if(rejected) {
            break;
        }
    }
    callbacks.onComplete(fullResponse);
    return messages;
}