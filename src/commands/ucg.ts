import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { AccureClient } from "../accure/client";
import { getEffectiveToken, getEffectiveApiUrl } from "../core/config";
import { logError, logInfo } from "../core/terminal";

export const ucgCommand = new Command("ucg")
  .description("Interact with Accure Unified Context Graph (EUCG) and Milvus vector store");

ucgCommand
  .command("query <prompt>")
  .description("Search enterprise documents and vector context")
  .option("-l, --limit <number>", "Number of results to return", "5")
  .action(async (prompt, options) => {
    const token = getEffectiveToken();
    if (!token) {
      logError("You must be logged in to query enterprise UCG.\nRun: iqx auth login");
      process.exit(1);
    }

    const s = p.spinner();
    s.start("Querying Unified Context Graph...");

    try {
      const client = new AccureClient();
      const results = await client.queryUCG(prompt, parseInt(options.limit, 10));
      s.stop(chalk.green("Results retrieved:"));

      console.log("\n" + JSON.stringify(results, null, 2) + "\n");
    } catch (err: any) {
      s.stop(chalk.red("Query failed"));
      logError(err.message);
    }
  });
