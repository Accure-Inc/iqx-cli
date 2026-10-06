import { Command } from "commander";
import chalk from "chalk";
import { configStore, type IQXConfig } from "../core/config";
import { logSuccess, logError } from "../core/terminal";

export const configCommand = new Command("config")
  .description("Inspect and update IQX CLI configuration");

configCommand
  .command("list")
  .description("List all configuration key-values")
  .action(() => {
    console.log(chalk.bold("\nIQX Configuration (~/.iqx/config.json):"));
    console.log(chalk.gray("─".repeat(45)));
    const all = configStore.store;
    for (const [key, value] of Object.entries(all)) {
      if (key === "api_token" && typeof value === "string") {
        const masked = value.length > 8 ? `${value.slice(0, 5)}....${value.slice(-4)}` : "***";
        console.log(`  ${chalk.cyan(key.padEnd(16))}: ${chalk.yellow(masked)}`);
      } else {
        console.log(`  ${chalk.cyan(key.padEnd(16))}: ${chalk.white(value)}`);
      }
    }
    console.log("");
  });

configCommand
  .command("get <key>")
  .description("Get a specific configuration setting")
  .action((key: keyof IQXConfig) => {
    const val = configStore.get(key);
    if (val === undefined) {
      logError(`Key "${key}" is not set.`);
    } else {
      console.log(val);
    }
  });

configCommand
  .command("set <key> <value>")
  .description("Set a configuration setting (e.g. api_url, default_model, sandbox_mode)")
  .action((key: string, value: string) => {
    configStore.set(key as any, value);
    logSuccess(`Updated ${key} = "${value}"`);
  });
