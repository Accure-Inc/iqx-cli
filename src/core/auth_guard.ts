import * as p from "@clack/prompts";
import chalk from "chalk";
import { configStore, getEffectiveToken, getEffectiveApiUrl } from "./config";
import { AccureClient, normalizeApiUrl } from "../accure/client";
import { logError } from "./terminal";

export async function ensureAuthenticated(): Promise<boolean> {
  const existingToken = getEffectiveToken();
  if (existingToken) {
    return true;
  }

  // Welcome banner for first-time launch
  console.log("\n" + chalk.bold.hex("#7C3AED")("⚡ Accure IQX CLI") + chalk.gray(" | Enterprise Setup"));
  console.log(chalk.gray("─".repeat(60)));
  console.log(chalk.yellow("No active Accure authentication found."));
  console.log(chalk.dim("Please connect your terminal to your Accure Enterprise instance.\n"));

  p.note(
    "1. Open AccureIQ in your browser (e.g. https://iqx-dev.accure.ai or http://localhost:3000)\n" +
    "2. Navigate to Developer Hub > API Key Manager\n" +
    "3. Click 'Create New Key' and copy your token (starts with ak-...)",
    "How to get an API Token"
  );

  const defaultUrl = getEffectiveApiUrl() || "http://localhost:3000";
  const urlInput = await p.text({
    message: "Enter Accure Web URL (Press Enter for default):",
    defaultValue: defaultUrl,
    placeholder: defaultUrl
  });

  if (p.isCancel(urlInput)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const rawUrl = (urlInput as string).trim() || defaultUrl;
  const apiUrl = normalizeApiUrl(rawUrl);

  const tokenInput = await p.password({
    message: "Enter your Accure API Token (starts with ak-):",
    validate: (value) => {
      if (!value || !value.trim()) {
        return "API Token is required.";
      }
      if (!value.trim().startsWith("ak-")) {
        return "Valid token must start with 'ak-'";
      }
    }
  });

  if (p.isCancel(tokenInput)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const token = (tokenInput as string).trim();

  const s = p.spinner();
  s.start("Verifying credentials with Accure Enterprise...");

  const client = new AccureClient(apiUrl, token);
  const result = await client.validateKey();

  if (!result.valid) {
    s.stop(chalk.red("Verification warning"));
    logError(result.error || "Could not verify API token with server");

    const saveAnyway = await p.confirm({
      message: "Could not verify connection to the server right now. Would you like to save credentials anyway?",
      initialValue: true
    });

    if (p.isCancel(saveAnyway) || !saveAnyway) {
      p.cancel("Setup aborted.");
      process.exit(1);
    }
  } else {
    s.stop(chalk.green("Credentials verified successfully!"));
  }

  const finalUrl = result.resolvedUrl || client.apiUrl;
  configStore.set("api_token", token);
  configStore.set("api_url", finalUrl);

  // Fetch and register default models (chat, vision, audio)
  const sModels = p.spinner();
  sModels.start("Fetching default AccureIQx models (chat, vision, audio)...");
  try {
    const summary = await client.fetchDefaultModels();
    sModels.stop(chalk.green("AccureIQx Models Synchronized!"));

    console.log("\n" + chalk.bold.cyan("AccureIQx Default Models:"));
    if (summary.chat) {
      console.log(`  ${chalk.bold("• Chat:")}   ${chalk.green(summary.chat.name)} ${chalk.dim(`(ID: ${summary.chat.id})`)}`);
      configStore.set("default_model", summary.chat.id);
      configStore.set("chat_model_id", summary.chat.id);
      configStore.set("active_model_name", summary.chat.name);
    } else {
      console.log(`  ${chalk.bold("• Chat:")}   ${chalk.gray("None configured (using system default)")}`);
      configStore.set("default_model", "accure-enterprise");
    }

    if (summary.vision) {
      console.log(`  ${chalk.bold("• Vision:")} ${chalk.green(summary.vision.name)} ${chalk.dim(`(ID: ${summary.vision.id})`)}`);
      configStore.set("vision_model_id", summary.vision.id);
      configStore.set("vision_model_name", summary.vision.name);
    } else {
      console.log(`  ${chalk.bold("• Vision:")} ${chalk.gray("None configured")}`);
    }

    if (summary.audio) {
      console.log(`  ${chalk.bold("• Audio:")}  ${chalk.green(summary.audio.name)} ${chalk.dim(`(ID: ${summary.audio.id})`)}`);
      configStore.set("audio_model_id", summary.audio.id);
      configStore.set("audio_model_name", summary.audio.name);
    } else {
      console.log(`  ${chalk.bold("• Audio:")}  ${chalk.gray("None configured")}`);
    }
    console.log();
  } catch (err: any) {
    sModels.stop(chalk.yellow("Could not load default models: " + err.message));
    configStore.set("default_model", "accure-enterprise");
  }

  p.outro(chalk.bold.green(`✔ Connected successfully to ${finalUrl}! Saved to ~/.iqx/config.json\n`));
  return true;
}
