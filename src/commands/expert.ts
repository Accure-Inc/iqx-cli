import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { AccureClient } from "../accure/client";
import { getEffectiveToken } from "../core/config";
import { logError, logInfo } from "../core/terminal";

export const expertCommand = new Command("expert")
  .description("Manage and interact with Accure Panel of Experts (POE)");

expertCommand
  .command("list")
  .description("List all available POE Panels and Experts accessible to your account")
  .action(async () => {
    const token = getEffectiveToken();
    if (!token) {
      logError("You must be authenticated to list enterprise experts.\nRun: iqx auth login");
      process.exit(1);
    }

    const s = p.spinner();
    s.start("Fetching enterprise Panels of Experts...");

    try {
      const client = new AccureClient();
      const [panels, experts] = await Promise.all([
        client.listPanels().catch(() => []),
        client.listExperts().catch(() => [])
      ]);

      s.stop(chalk.green("Panels & Experts loaded:"));

      console.log(chalk.bold("\nExpert Panels (Teams):"));
      console.log(chalk.gray("─".repeat(50)));
      if (panels.length === 0) {
        console.log(chalk.dim("  No panels found."));
      } else {
        for (const panel of panels) {
          const statusColor = panel.status === "active" ? chalk.green : chalk.yellow;
          console.log(
            `  • ${chalk.bold.cyan(panel.title)} ` +
            `${statusColor("[" + panel.status + "]")}\n` +
            `    ${chalk.dim(panel.description || "No description provided")}\n` +
            `    ${chalk.gray("ID: " + panel.id)}`
          );
        }
      }

      console.log(chalk.bold("\nIndividual Experts:"));
      console.log(chalk.gray("─".repeat(50)));
      if (experts.length === 0) {
        console.log(chalk.dim("  No individual experts found."));
      } else {
        for (const exp of experts) {
          console.log(
            `  • ${chalk.bold.yellow(exp.title)} ` +
            `${chalk.dim("(" + exp.status + ")")}\n` +
            `    ${chalk.dim(exp.description || "No description")}\n` +
            `    ${chalk.gray("ID: " + exp.id)}`
          );
        }
      }
      console.log("");
    } catch (err: any) {
      s.stop(chalk.red("Failed to load experts"));
      logError(err.message);
    }
  });
