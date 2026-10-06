import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { Agent } from "../core/agent";
import { renderBanner, logInfo } from "../core/terminal";
import { configStore } from "../core/config";
import { getGitDiff } from "../tools/git_tools";
import { ensureAuthenticated } from "../core/auth_guard";

export async function startChatSession(options: { model?: string; yes?: boolean } = {}) {
  const model = options.model || configStore.get("default_model") || "accure-enterprise";
  renderBanner(model);

  const agent = new Agent({
    model,
    autoApprove: options.yes
  });

  logInfo("Type your request, or use " + chalk.bold("/help") + " for shortcuts. (Ctrl+C to quit)");

  while (true) {
    const input = await p.text({
      message: chalk.bold.cyan("iqx >"),
      placeholder: "Ask anything, edit files, or debug code..."
    });

    if (p.isCancel(input)) {
      p.outro("Session ended. Goodbye!");
      process.exit(0);
    }

    const prompt = (input as string).trim();
    if (!prompt) continue;

    if (prompt === "/exit" || prompt === "/quit") {
      p.outro("Goodbye!");
      break;
    }

    if (prompt === "/help") {
      console.log(chalk.bold("\nAvailable Commands:"));
      console.log("  " + chalk.cyan("/diff") + "     Review uncommitted git changes");
      console.log("  " + chalk.cyan("/clear") + "    Clear screen");
      console.log("  " + chalk.cyan("/exit") + "     Exit session\n");
      continue;
    }

    if (prompt === "/diff") {
      const diffText = await getGitDiff();
      if (!diffText) {
        console.log(chalk.yellow("\nNo uncommitted changes.\n"));
      } else {
        console.log("\n" + diffText + "\n");
      }
      continue;
    }

    if (prompt === "/clear") {
      console.clear();
      renderBanner(model);
      continue;
    }

    await agent.run(prompt);
  }
}

export const chatCommand = new Command("chat")
  .description("Start an interactive agentic pair-programming session")
  .option("-m, --model <model>", "Model to use (accure-enterprise, gpt-4o)")
  .option("-y, --yes", "Auto-approve all tool actions (autonomous mode)")
  .action(async (options) => {
    await ensureAuthenticated();
    await startChatSession(options);
  });
