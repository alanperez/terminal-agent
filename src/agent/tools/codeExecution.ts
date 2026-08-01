import { tool } from "ai";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import os from "os";
import shell from "shelljs";

/**
 * Key Implementation Details:
 * - Supports multiple languages with diff runtimes
 * - Uses temp directory to avoid polluting working directory
 * - Cleans up temp files in a finally block
 * - Typescript executed via tsx for seamless TS execution
 * - This is a "composite tool" - it does what could be 2+ tool calls ( write file, execute) in one
 */

// type CommandFunction = (file: string) => string;

/**
 * Execute code by writing to temp file and running it
 * This is a composite tool that demonstrates doing multiple steps internally
 * vs letting the model orchestrate separate tools (writeFIle + runCommand)
 */
export const executeCode = tool({
    description: "Execute code for anything you need to compute for. Supports Javascript (Node.js), Python, and Typescript. Returns the output of the execution.",
    inputSchema: z.object({
        code: z.string().describe("The code to execute"),
        language: z.enum(["javascript", "python", "typescript"]).describe("The programming language of the code").default("javascript")
    }),
    execute: async({ code, language }: { code: string, language: "javascript" | "python" | "typescript"}) => {

        // Determine the file extension and run command based on language
        const extensions: Record<string, string> = {
            javascript: ".js",
            python: ".py",
            typescript: ".ts"
        };

        const commands: Record<string, (file: string) => string> = {
            javascript: (file) => `node ${file}`,
            python: (file) => `python3 ${file}`,
            typescript: (file) => `tsx ${file}`
        }

        const ext = extensions[language]
        const getCommand = commands[language];
        const tmpFile = path.join(os.tmpdir(), `code-exec-${Date.now()}${ext}`);
        
        try {
            // write code to temp file
            await fs.writeFile(tmpFile, code, "utf-8");

            // Execute code
            const command = getCommand(tmpFile);
            const result = shell.exec(command, { silent: true });
            
            let output = ""
            
            if (result.stdout) {
                output += result.stdout;
            }

            if (result.stderr) {
                output += result.stderr;
            }

            if(result.code !== 0) {
                return `Execution failed (exit code ${result.code}):\n${output}`
            }

            return output || `Code executed succfessfully (no output)`;

        } catch (error) {
            const err = error as Error;
            return `Error executing code: ${err.message};`
            
        } finally {
            // Clean up tmp file
            try {
                await fs.unlink(tmpFile);
            } catch {
                // Ignore cleanup errs
            }

        }

    }
})