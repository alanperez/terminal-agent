// Basic agent runner
import "dotenv/config"
import { generateText, streamText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { LaminarAiSdkTelemetry, registerAiSdkTelemetry } from "@lmnr-ai/lmnr"
import { registerTelemetry } from "ai";
import { SYSTEM_PROMPT } from "./system/prompts.ts"

import type { AgentCallbacks } from "../types.ts";

import { tools } from "./tools/index.ts";

const model = "gpt-5-mini";

// Laminar.initialize()
// registerAiSdkTelemetry(); // inits Laminar and calls Laminar.initalize

registerTelemetry(
    new LaminarAiSdkTelemetry({
        laminarOptions: { projectApiKey: process.env.LMNR_PROJECT_API_KEY }
    })
)

export async function runAgent( userMessage: string, conversationHistory: ModelMessage[], callbacks: AgentCallbacks): Promise<any> {
    const { text } = await generateText({
        model: openai(model),
        prompt: userMessage,
        system: SYSTEM_PROMPT,
        tools,
        telemetry: {
            isEnabled: true
        },
        
    })
    console.log("done.")
    console.log('text: ', text)
}