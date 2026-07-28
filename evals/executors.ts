import type {
    EvalData,
    SingleTurnResult,
    MultiTurnEvalData,
    MultiTurnResult,

} from "./types.ts"

import { generateText, ModelMessage, stepCountIs, tool, type ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { buildMessages, buildMockedTools } from "./utils.ts"
import { SYSTEM_PROMPT } from "../src/agent/system/prompts.ts";

/**
 * Tool definitions for mocked single-turn evaluations.
 * These define the schema the LLM sees without real implementations.
 */
const TOOL_DEFINITIONS: Record<
  string,
  { description: string; parameters: z.ZodObject<z.ZodRawShape> }
> = {
  // File tools
  readFile: {
    description: "Read the contents of a file at the specified path",
    parameters: z.object({
      path: z.string().describe("The path to the file to read"),
    }),
  },
  writeFile: {
    description: "Write content to a file at the specified path",
    parameters: z.object({
      path: z.string().describe("The path to the file to write"),
      content: z.string().describe("The content to write to the file"),
    }),
  },
  listFiles: {
    description: "List all files in a directory",
    parameters: z.object({
      path: z.string().describe("The directory path to list files from"),
    }),
  },
  deleteFile: {
    description: "Delete a file at the specified path",
    parameters: z.object({
      path: z.string().describe("The path to the file to delete"),
    }),
  },
  // Shell tools
  runCommand: {
    description: "Execute a shell command and return its output",
    parameters: z.object({
      command: z.string().describe("The shell command to execute"),
    }),
  },
};

/**
 * Single-turn executor with mocked tools.
 * Uses predefined tool definitions - tools never execute, only selection is tested.
 */
export async function singleTurnWithMocks(
  data: EvalData,
): Promise<SingleTurnResult> {
  const messages = buildMessages(data);

  // Build mocked tools from definitions
  const tools: ToolSet = {};
  for (const toolName of data.tools) {
    const def = TOOL_DEFINITIONS[toolName];
    if (def) {
      tools[toolName] = tool({
        description: def.description,
        inputSchema: def.parameters,
      });
    }
  }

  const result = await generateText({
    model: openai(data.config?.model ?? "gpt-4o-mini"),
    instructions: data.systemPrompt ?? SYSTEM_PROMPT,
    messages, // now only user/assistant/tool messages
    tools,
    stopWhen: stepCountIs(1),
    temperature: data.config?.temperature ?? undefined,
  });

  // Extract tool calls from the result
  const toolCalls = (result.toolCalls ?? []).map((tc) => ({
    toolName: tc.toolName,
    args: "args" in tc ? tc.args : {},
  }));

  const toolNames = toolCalls.map((tc) => tc.toolName);

  return {
    toolCalls,
    toolNames,
    selectedAny: toolNames.length > 0,
  };
}


/**
 * Multi-turn executor with mocked tools
 * Runs a complete agent loop with tools returning fixed values
 */
export async function multiTurnWithMocks(
    data: MultiTurnEvalData
): Promise<MultiTurnResult> {
    // Uses buildMockedTools to create tools with fixed return values
    const tools = buildMockedTools(data.mockTools);

    // Build messages from either prompt or pre filled history
    const messages: ModelMessage[] = data.messages ?? [
        // {
        //     role: "system", content: SYSTEM_PROMPT // commented out, no longer works in v7, It injects the system role into messages and doesnt pass instructions
        // },
        {
            role: "user", content: data.prompt!
        }
    ]; // supports both fresh prompts and pre filled message history.

    const result = await generateText({
        model: openai(data.config?.model ?? "gpt-5-mini"),
        instructions: SYSTEM_PROMPT,
        messages,
        tools,
        stopWhen: stepCountIs(data.config?.maxSteps ?? 20), // stepCountIs(20) prevents infinite loops
    });

    // Extract all tool calls in order from steps
    const allToolCalls: string[] = [];

    const steps = result.steps.map((step) => {
        const stepToolCalls = (step.toolCalls ?? []).map((tc) => {
            allToolCalls.push(tc.toolName);
            return {
                toolName: tc.toolName,
                args: "args" in tc ? tc.args : {},
            }
        });

        const stepToolResults = (step.toolResults ?? []).map((tr) => ({
        toolName: tr.toolName,
        result: "result" in tr ? tr.result : tr,
        }));

        return {
            toolCalls: stepToolCalls.length > 0 ? stepToolCalls : undefined,
            toolResults: stepToolResults.length > 0 ? stepToolResults : undefined,
            text: step.text || undefined
        }
    });

    // Extract unique tools used
    const toolsUsed = [...new Set(allToolCalls)];
    // return unique tools used and the full tool call order.
    return {
        text: result.text,
        steps,
        toolsUsed,
        toolCallOrder: allToolCalls
    }
}