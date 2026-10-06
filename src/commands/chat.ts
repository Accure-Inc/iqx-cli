import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { Agent } from "../core/agent";
import { renderBanner, logInfo, logSuccess, logError } from "../core/terminal";
import { configStore, getActiveModel } from "../core/config";
import { getGitDiff } from "../tools/git_tools";
import { ensureAuthenticated } from "../core/auth_guard";
import { AccureClient } from "../accure/client";

export async function startChatSession(options: { model?: string; yes?: boolean } = {}) {
  let active = getActiveModel();
  let currentModel = options.model || active.id || "accure-enterprise";
  renderBanner(currentModel);

  const agent = new Agent({
    model: currentModel,
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
      console.log("  " + chalk.cyan("/model [id]") + "  Switch active AI model (interactive if no ID provided)");
      console.log("  " + chalk.cyan("/diff") + "        Review uncommitted git changes");
      console.log("  " + chalk.cyan("/clear") + "       Clear screen");
      console.log("  " + chalk.cyan("/exit") + "        Exit session\n");
      continue;
    }

    if (prompt.startsWith("/model") || prompt.startsWith("/models")) {
      const parts = prompt.split(/\s+/);
      const targetId = parts[1];

      if (targetId) {
        // Direct switch
        currentModel = targetId;
        agent.options.model = targetId;
        configStore.set("default_model", targetId);
        logSuccess(`Active model switched to: ${chalk.bold.yellow(targetId)}`);
      } else {
        // Interactive selection from AccureIQx catalog
        const s = p.spinner();
        s.start("Fetching AccureIQx model catalog...");
        try {
          const client = new AccureClient();
          const models = await client.listModels();
          s.stop(chalk.green("AccureIQx Models"));

          const selectOptions = models
            .filter(m => m.is_active)
            .map(m => ({
              value: m.id,
              label: `${m.name} [${m.model_type.toUpperCase()}]`,
              hint: `ID: ${m.id} (${m.provider})`
            }));

          const selected = await p.select({
            message: `Select active model (Current: ${currentModel}):`,
            options: selectOptions,
            initialValue: currentModel
          });

          if (!p.isCancel(selected)) {
            const chosenId = selected as string;
            const chosen = models.find(m => m.id === chosenId);
            currentModel = chosenId;
            agent.options.model = chosenId;
            configStore.set("default_model", chosenId);
            if (chosen) {
              configStore.set("active_model_name", chosen.name);
            }
            logSuccess(`Switched to: ${chalk.bold.yellow(chosen?.name || chosenId)} (${chosenId})`);
          }
        } catch (err: any) {
          s.stop(chalk.red("Failed to fetch models"));
          logError(err.message);
        }
      }
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
      renderBanner(currentModel);
      continue;
    }

    await agent.run(prompt);
  }
}

export const chatCommand = new Command("chat")
  .description("Start an interactive agentic pair-programming session")
  .option("-m, --model <model>", "Model to use (AccureIQx Model ID or name)")
  .option("-y, --yes", "Auto-approve all tool actions (autonomous mode)")
  .action(async (options) => {
    await ensureAuthenticated();
    await startChatSession(options);
  });
