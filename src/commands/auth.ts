import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { configStore, getEffectiveToken, getEffectiveApiUrl } from "../core/config";
import { AccureClient } from "../accure/client";
import { logSuccess, logError } from "../core/terminal";

export const authCommand = new Command("auth")
  .description("Manage authentication with AccureIQx Developer Hub API Tokens");

authCommand
  .command("login")
  .description("Authenticate with an Accure API Token from Developer Hub > API Key Manager")
  .option("-t, --token <token>", "Pass token directly")
  .option("-u, --url <url>", "Accure API URL (defaults to https://iqx-dev.accure.ai)")
  .action(async (options) => {
    p.intro(chalk.bold.hex("#7C3AED")("AccureIQx Authentication"));

    let url = options.url;
    if (!url) {
      const defaultUrl = getEffectiveApiUrl() || "https://iqx-dev.accure.ai";
      const urlInput = await p.text({
        message: "Enter Accure API URL:",
        defaultValue: defaultUrl,
        placeholder: defaultUrl
      });

      if (p.isCancel(urlInput)) {
        p.cancel("Login cancelled.");
        process.exit(0);
      }
      url = ((urlInput as string).trim() || defaultUrl).replace(/\/$/, "");
    }

    let token = options.token;
    if (!token) {
      p.note(
        "To get an API token:\n" +
        "1. Open AccureIQx in your browser (e.g. https://iqx.accure.ai)\n" +
        "2. Navigate to Developer Hub > API Key Manager (or /developer/api-keys)\n" +
        "3. Click 'Create New Key' and copy your token (starts with ak-...)",
        "Instructions"
      );

      const input = await p.password({
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

      if (p.isCancel(input)) {
        p.cancel("Login cancelled.");
        process.exit(0);
      }
      token = (input as string).trim();
    }

    const s = p.spinner();
    s.start("Validating token with Accure Enterprise Gateway...");

    const client = new AccureClient(url, token);
    const result = await client.validateKey();

    if (!result.valid) {
      s.stop(chalk.red("Authentication failed"));
      logError(result.error || "Unable to verify API token");

      const saveAnyway = await p.confirm({
        message: "Could not reach server or verify key. Save anyway?",
        initialValue: false
      });
      if (p.isCancel(saveAnyway) || !saveAnyway) {
        process.exit(1);
      }
    } else {
      s.stop(chalk.green("Token successfully verified!"));
    }

    configStore.set("api_token", token);
    configStore.set("api_url", url);
    configStore.set("default_model", "accure-enterprise");

    p.outro(chalk.bold.green("✔ Logged in successfully. Config saved to ~/.iqx/config.json"));
  });

authCommand
  .command("logout")
  .description("Clear stored API token")
  .action(() => {
    configStore.delete("api_token");
    logSuccess("Successfully logged out. Stored API token cleared.");
  });

authCommand
  .command("whoami")
  .description("Check current authentication status")
  .action(async () => {
    const token = getEffectiveToken();
    const url = getEffectiveApiUrl();

    console.log(chalk.bold("\nAccureIQx Authentication Status:"));
    console.log(chalk.gray("─".repeat(40)));
    console.log(chalk.dim("API URL:       ") + chalk.cyan(url));

    if (!token) {
      console.log(chalk.dim("Status:        ") + chalk.yellow("Not authenticated (No token configured)"));
      console.log(chalk.dim("Hint:          Run ") + chalk.bold("iqx auth login") + chalk.dim(" or set IQX_API_TOKEN\n"));
      return;
    }

    const preview = token.length > 10 ? `${token.slice(0, 5)}....${token.slice(-4)}` : "***";
    console.log(chalk.dim("Token:         ") + chalk.green(preview));

    const s = p.spinner();
    s.start("Checking server connection...");
    const client = new AccureClient(url, token);
    const result = await client.validateKey();

    if (result.valid) {
      s.stop(chalk.green("Active & Connected to AccureIQx"));
    } else {
      s.stop(chalk.red("Connection Error: " + (result.error || "Invalid token")));
    }
    console.log("");
  });
