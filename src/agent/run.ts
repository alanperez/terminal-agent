// Basic agent runner
import "dotenv/config"
import { generateText, streamText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";

import { SYSTEM_PROMPT } from "./system/prompts.ts"

import type { AgentCallbacks } from "../types.ts";

import { tools } from "./tools/index.ts";

const model = "gpt-5-mini";

export async function runAgent( userMessage: string, conversationHistory: ModelMessage[], callbacks: AgentCallbacks): Promise<any> {
    const { text, toolCalls } = await generateText({
        model: openai(model),
        prompt: userMessage,
        system: SYSTEM_PROMPT,
        tools
    })

    console.log('text: ', text, "tools: ", toolCalls)
}

runAgent("What is the current time")