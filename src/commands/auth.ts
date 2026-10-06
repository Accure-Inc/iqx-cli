import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { configStore, getEffectiveToken, getEffectiveApiUrl } from "../core/config";
import { AccureClient } from "../accure/client";
import { logSuccess, logError, logInfo } from "../core/terminal";

export const authCommand = new Command("auth")
  .description("Manage authentication with AccureIQ Developer Hub API Tokens");

authCommand
  .command("login")
  .description("Authenticate with an IQX Token from Developer Hub > API Key Manager")
  .option("-t, --token <token>", "Pass token directly")
  .option("-u, --url <url>", "AccureIQ API URL (defaults to http://localhost:8000)")
  .action(async (options) => {
    p.intro(chalk.bold.hex("#7C3AED")("IQX Authentication"));

    let token = options.token;
    let url = options.url || getEffectiveApiUrl();

    if (!token) {
      p.note(
        "To get an API token:\n" +
        "1. Open AccureIQ in your browser\n" +
        "2. Navigate to Developer Hub > API Key Manager\n" +
        "3. Click \x27Generate API Key\x27 and copy your token (ak-...)",
        "Instructions"
      );

      const input = await p.password({
        message: "Enter your IQX API Token (starts with ak-):",
        validate: (value) => {
          if (!value || !value.startsWith("ak-")) {
            return "Valid token must start with 'ak-'";
          }
        }
      });

      if (p.isCancel(input)) {
        p.cancel("Login cancelled.");
        process.exit(0);
      }
      token = input as string;
    }

    const s = p.spinner();
    s.start("Validating token with AccureIQ Gateway...");

    const client = new AccureClient(url, token);
    const result = await client.validateKey();

    if (!result.valid) {
      s.stop(chalk.red("Authentication failed"));
      logError(result.error || "Unable to verify API token");
      process.exit(1);
    }

    s.stop(chalk.green("Token successfully verified!"));

    configStore.set("api_token", token);
    configStore.set("api_url", url);

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

    console.log(chalk.bold("\nIQX Authentication Status:"));
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
      s.stop(chalk.green("Active & Connected to AccureIQ"));
    } else {
      s.stop(chalk.red("Connection Error: " + (result.error || "Invalid token")));
    }
    console.log("");
  });
