import { tool } from "ai";
import { z } from "zod";
import shell from "shelljs";

/**
 * Key implementation details:
 * - silent: true, prevents output from going directly to console.
 * - We capture both stdout and stderr
 * - Non-zero exits codes are reported as failures
 *  - Empty output gets a confirmation message
 */

/**
 * Run a shell command
 */

export const runCommand = tool({
    description: "Execute a shell command and return its output. Use this for system operations, running scripts, or interacting with the operating system.",
    inputSchema: z.object({
        command: z.string().describe("The shell command to execute")
    }),
    execute: async({ command }: { command: string }) => {
        const result = shell.exec(command, { silent: true });

        let output = "";
        if(result.stdout ) {
            output += result.stdout;
        }

        if(result.stderr) {
            output += result.stderr;
        }

        if(result.code !== 0) {
            return `Command failed (exit code ${result.code}):\n${output}`;
        }

        return output || "Command completed successfully (no output)";
    }
})