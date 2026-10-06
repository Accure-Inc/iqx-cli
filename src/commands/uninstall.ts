import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as readline from "node:readline";
import colors from "yoctocolors";
import { execSync } from "node:child_process";

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase());
    })
  );
}

export const uninstallCommand = new Command("uninstall")
  .description("Uninstall the IQX CLI from this machine")
  .option("-y, --yes", "Skip interactive confirmation")
  .option("--purge", "Also remove configuration directory (~/.iqx) and saved API tokens")
  .action(async (options) => {
    console.log(colors.bold("\nIQX CLI Uninstaller"));
    console.log(colors.dim("────────────────────────────────────────"));

    // Find candidate binary paths
    const candidates = [
      "/usr/local/bin/iqx",
      path.join(os.homedir(), ".local", "bin", "iqx"),
    ];

    try {
      const whichIqx = execSync("which iqx 2>/dev/null", { encoding: "utf-8" }).trim();
      if (whichIqx && !candidates.includes(whichIqx)) {
        candidates.push(whichIqx);
      }
    } catch {
      // ignore
    }

    const existingTargets = candidates.filter((p) => {
      try {
        return fs.existsSync(p) || fs.lstatSync(p).isSymbolicLink();
      } catch {
        return false;
      }
    });

    const configDir = path.join(os.homedir(), ".iqx");
    const hasConfig = fs.existsSync(configDir);

    if (existingTargets.length === 0 && !hasConfig) {
      console.log(colors.yellow("No global IQX installation or configuration found on this system."));
      return;
    }

    console.log(colors.cyan("Items detected:"));
    if (existingTargets.length > 0) {
      for (const t of existingTargets) {
        console.log(`  • Executable: ${colors.bold(t)}`);
      }
    }
    if (hasConfig) {
      console.log(`  • Config:     ${colors.bold(configDir)} ${options.purge ? colors.red("(will be purged)") : colors.dim("(preserved unless --purge)")}`);
    }
    console.log();

    if (!options.yes) {
      const answer = await askQuestion(colors.yellow("Are you sure you want to uninstall IQX CLI? [y/N]: "));
      if (answer !== "y" && answer !== "yes") {
        console.log(colors.dim("Uninstall cancelled."));
        return;
      }
    }

    // Remove executables
    let removedAny = false;
    for (const target of existingTargets) {
      try {
        fs.unlinkSync(target);
        console.log(colors.green(`✔ Removed ${target}`));
        removedAny = true;
      } catch (err: any) {
        console.log(colors.red(`✖ Failed to remove ${target}: ${err.message}`));
        console.log(colors.dim(`  Try running: sudo rm -f ${target}`));
      }
    }

    // Remove configuration if purge requested
    if (options.purge && hasConfig) {
      try {
        fs.rmSync(configDir, { recursive: true, force: true });
        console.log(colors.green(`✔ Removed configuration directory: ${configDir}`));
      } catch (err: any) {
        console.log(colors.red(`✖ Failed to remove ${configDir}: ${err.message}`));
      }
    } else if (hasConfig && !options.purge && !options.yes) {
      const purgeAnswer = await askQuestion(colors.yellow("Would you also like to delete ~/.iqx configuration and auth keys? [y/N]: "));
      if (purgeAnswer === "y" || purgeAnswer === "yes") {
        try {
          fs.rmSync(configDir, { recursive: true, force: true });
          console.log(colors.green(`✔ Removed configuration directory: ${configDir}`));
        } catch (err: any) {
          console.log(colors.red(`✖ Failed to remove ${configDir}: ${err.message}`));
        }
      } else {
        console.log(colors.dim(`~/.iqx preserved.`));
      }
    }

    console.log(colors.bold(colors.green("\n✔ IQX CLI has been uninstalled successfully.\n")));
  });
