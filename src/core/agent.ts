import chalk from "chalk";
import * as p from "@clack/prompts";
import { callModel, type ChatMessage } from "../providers/resolver";
import { AVAILABLE_TOOLS, executeTool } from "../tools/registry";
import { renderToolStart, renderDiff, logSuccess, logError, logWarning } from "./terminal";
import { configStore } from "./config";

export interface AgentOptions {
  model?: string;
  autoApprove?: boolean;
  maxTurns?: number;
}

const SYSTEM_PROMPT = `You are IQX Agent, an elite terminal pair-programming assistant built by Accure.
You have direct access to tools for inspecting and modifying the current workspace:
- view_file: View file contents with line numbers
- edit_file: Make precise text replacements (shows diff)
- run_bash: Run tests, compilers, git, or terminal commands
- grep_search: Search files for regex patterns or keywords
- git_status & git_diff: Inspect version control state

Rules:
1. Always view relevant files or grep search before modifying them.
2. When editing files, ensure targetContent exactly matches existing file contents.
3. After making changes, run relevant test suites or compilers to verify correctness.
4. Keep your responses concise and focused on the coding task.`;

export class Agent {
  private history: ChatMessage[] = [];
  private options: AgentOptions;

  constructor(options: AgentOptions = {}) {
    this.options = {
      maxTurns: 15,
      ...options
    };
    this.history.push({ role: "system", content: SYSTEM_PROMPT });
  }

  async run(prompt: string): Promise<string> {
    this.history.push({ role: "user", content: prompt });
    let turns = 0;
    const maxTurns = this.options.maxTurns || 15;

    while (turns < maxTurns) {
      turns++;
      const s = p.spinner();
      s.start(chalk.dim("IQX Thinking..."));

      let response;
      try {
        response = await callModel(this.history, AVAILABLE_TOOLS, this.options.model);
      } catch (err: any) {
        s.stop(chalk.red("Error calling model"));
        logError(err.message);
        return "";
      }

      s.stop(chalk.dim("Plan formulated"));

      if (response.content) {
        console.log("\n" + response.content + "\n");
      }

      if (!response.tool_calls || response.tool_calls.length === 0) {
        // Model is done, no more tools requested
        return response.content;
      }

      // Record assistant tool calls in history
      this.history.push({
        role: "assistant",
        content: response.content || "",
        tool_calls: response.tool_calls
      });

      // Execute each tool call
      for (const tc of response.tool_calls) {
        renderToolStart(tc.name, tc.name === "run_bash" ? tc.arguments.command : tc.arguments.filePath || tc.arguments.query);

        // Permission check
        const isAutonomous = this.options.autoApprove || configStore.get("sandbox_mode") === "autonomous";
        if (!isAutonomous && (tc.name === "run_bash" || tc.name === "edit_file")) {
          const proceed = await p.confirm({
            message: `Execute tool ${chalk.bold.yellow(tc.name)}?`,
            initialValue: true
          });
          if (p.isCancel(proceed) || !proceed) {
            logWarning(`Skipped tool ${tc.name}`);
            this.history.push({
              role: "tool",
              name: tc.id,
              content: "User rejected execution of this tool."
            });
            continue;
          }
        }

        try {
          const result = await executeTool(tc.name, tc.arguments);

          if (tc.name === "edit_file" && result.diffText) {
            renderDiff(tc.arguments.filePath, result.diffText);
            logSuccess(`Updated ${tc.arguments.filePath}`);
          } else if (tc.name === "run_bash") {
            if (result.exitCode === 0) {
              logSuccess(`Command succeeded (exit 0) in ${result.durationMs}ms`);
            } else {
              logError(`Command failed (exit ${result.exitCode})`);
            }
          }

          const toolOutput = typeof result === "string" ? result : JSON.stringify(result, null, 2);
          this.history.push({
            role: "tool",
            name: tc.id,
            content: toolOutput
          });
        } catch (err: any) {
          logError(`Tool ${tc.name} failed: ${err.message}`);
          this.history.push({
            role: "tool",
            name: tc.id,
            content: `Error: ${err.message}`
          });
        }
      }
    }

    return "Reached maximum iteration limit.";
  }
}
