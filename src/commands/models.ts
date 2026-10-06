import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import Table from "cli-table3";
import { configStore, getActiveModel } from "../core/config";
import { AccureClient, type AccureModel } from "../accure/client";
import { logError, logSuccess, logInfo } from "../core/terminal";

export const modelsCommand = new Command("models")
  .alias("model")
  .description("Manage and switch AccureIQx enterprise AI models (chat, vision, audio)")
  .action(async () => {
    await listModelsAction();
  });

modelsCommand
  .command("list")
  .description("List all available AccureIQx models grouped by type")
  .action(async () => {
    await listModelsAction();
  });

modelsCommand
  .command("default")
  .description("Fetch and display the default chat, vision, and audio models")
  .action(async () => {
    const s = p.spinner();
    s.start("Fetching default AccureIQx models...");
    try {
      const client = new AccureClient();
      const summary = await client.fetchDefaultModels();
      s.stop(chalk.green("AccureIQx Default Models"));

      console.log("\n" + chalk.bold.cyan("AccureIQx Default Models:"));
      console.log(
        `  ${chalk.bold("• Chat:")}   ${summary.chat ? chalk.green(summary.chat.name) + chalk.dim(` (ID: ${summary.chat.id})`) : chalk.gray("None")}`
      );
      console.log(
        `  ${chalk.bold("• Vision:")} ${summary.vision ? chalk.green(summary.vision.name) + chalk.dim(` (ID: ${summary.vision.id})`) : chalk.gray("None")}`
      );
      console.log(
        `  ${chalk.bold("• Audio:")}  ${summary.audio ? chalk.green(summary.audio.name) + chalk.dim(` (ID: ${summary.audio.id})`) : chalk.gray("None")}`
      );
      console.log();
    } catch (err: any) {
      s.stop(chalk.red("Failed to fetch models"));
      logError(err.message);
    }
  });

modelsCommand
  .command("set <modelId>")
  .description("Switch active model by providing the Model ID or Name from AccureIQx")
  .action(async (modelId: string) => {
    await setModelAction(modelId);
  });

async function listModelsAction() {
  const s = p.spinner();
  s.start("Fetching models from AccureIQx...");

  try {
    const client = new AccureClient();
    const models = await client.listModels();
    s.stop(chalk.green(`Loaded ${models.length} AccureIQx models`));

    const active = getActiveModel();
    console.log("\n" + chalk.bold.hex("#7C3AED")("⚡ AccureIQx Model Catalog"));
    console.log(chalk.gray("────────────────────────────────────────────────────────────"));
    console.log(chalk.cyan(`Active Model: ${chalk.bold.yellow(active.name || active.id)} ${chalk.dim(`(${active.id})`)}\n`));

    const renderGroup = (title: string, groupModels: AccureModel[]) => {
      console.log(chalk.bold.underline(title) + chalk.dim(` (${groupModels.length})`));
      if (!groupModels.length) {
        console.log(chalk.dim("  No models registered in this category.\n"));
        return;
      }

      const table = new Table({
        head: [
          chalk.bold("Name"),
          chalk.bold("Model ID / _id"),
          chalk.bold("Provider"),
          chalk.bold("Default"),
          chalk.bold("Status")
        ],
        colWidths: [28, 30, 16, 10, 10],
        wordWrap: true
      });

      for (const m of groupModels) {
        const isCurrent = m.id === active.id || m.model_id === active.id || m.name === active.id;
        const nameDisplay = isCurrent ? chalk.bold.green(`✔ ${m.name}`) : m.name;
        const idDisplay = isCurrent ? chalk.green(m.id) : chalk.dim(m.id);
        const defaultDisplay = m.is_default ? chalk.cyan("Yes") : chalk.gray("No");
        const statusDisplay = m.is_active ? chalk.green("Active") : chalk.red("Inactive");

        table.push([nameDisplay, idDisplay, m.provider, defaultDisplay, statusDisplay]);
      }

      console.log(table.toString());
      console.log();
    };

    renderGroup("Chat Models", models.filter(m => m.model_type === "chat"));
    renderGroup("Vision Models", models.filter(m => m.model_type === "vision"));
    renderGroup("Audio Models", models.filter(m => m.model_type === "audio"));

    console.log(chalk.dim("Tip: Switch model using: iqx models set <model_id>\n"));
  } catch (err: any) {
    s.stop(chalk.red("Failed to list models"));
    logError(err.message);
  }
}

export async function setModelAction(modelInput: string): Promise<boolean> {
  const trimmed = modelInput.trim();
  const s = p.spinner();
  s.start(`Looking up model "${trimmed}" in AccureIQx...`);

  try {
    const client = new AccureClient();
    const models = await client.listModels();

    // Match by _id, model_id, or name
    const match = models.find(
      m => m.id === trimmed || m.model_id === trimmed || m.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (match) {
      configStore.set("default_model", match.id);
      configStore.set("active_model_name", match.name);
      if (match.model_type === "chat") {
        configStore.set("chat_model_id", match.id);
      } else if (match.model_type === "vision") {
        configStore.set("vision_model_id", match.id);
      } else if (match.model_type === "audio") {
        configStore.set("audio_model_id", match.id);
      }

      s.stop(chalk.green("Model updated!"));
      logSuccess(`Active model switched to: ${chalk.bold.yellow(match.name)} (${match.id})`);
      logInfo(`Type: ${match.model_type} | Provider: ${match.provider} | Model Ref: ${match.model_id}`);
      return true;
    } else {
      // Allow custom ID anyway with confirmation
      s.stop(chalk.yellow(`Model "${trimmed}" not found in current catalog.`));
      configStore.set("default_model", trimmed);
      configStore.set("active_model_name", trimmed);
      logSuccess(`Active model set to custom ID: ${chalk.bold.yellow(trimmed)}`);
      return true;
    }
  } catch (err: any) {
    s.stop(chalk.red("Error setting model"));
    logError(err.message);
    return false;
  }
}
