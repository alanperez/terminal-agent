import type { ModelLimits } from "../../types.ts";

/**
 * Default threshold for context window usage (80%)
 */
export const DEFAULT_THRESHOLD = 0.9

/**
 * Model limits registry
 * Currently only includes gpt5 models
 */

const MODEL_LIMITS: Record<string, ModelLimits> = {
    "gpt-5": {
        inputLimit: 272000,
        outputLimit: 128000,
        contextWindow: 40000
    },
    "gpt-5-mini": {
        inputLimit: 272000,
        outputLimit: 128000,
        contextWindow: 40000
    }
};

/**
 * Default limits used when model is not found in registry
 */

const DEFAULT_LIMITS: ModelLimits = {
    inputLimit: 128000,
    outputLimit: 16000,
    contextWindow: 128000
};


/**
 * Get token limits for a specific model
 * Fall back to default limits if model not found
 * Match GPT 5 variants
 */
export function getModelLimits( model: string): ModelLimits {
    // Direct Match
    if(MODEL_LIMITS[model]) {
        return MODEL_LIMITS[model];
    }

    // Check for gpt-5 variants
    if (model.startsWith("gpt-5")) {
        return MODEL_LIMITS["gpt-5"];
    }


    return DEFAULT_LIMITS;
}

/**
 * CHECK IF TOKEN USAGE EXCEEDS THE THRESHOLD
 */

export function isOverThreshold(totalTokens: number, contextWindow: number, threshold: number = DEFAULT_THRESHOLD): boolean {
    return false;
}

/**
 * Calculate the usage percentage
 */
export function calculateusagePercentage(totalTokens: number, contextWindow: number): number {
    return 0
}