import chalk from "chalk";

export function renderBanner(model: string, user?: string, org?: string) {
  const line = chalk.gray("─".repeat(60));
  console.log(chalk.bold.hex("#7C3AED")("⚡ IQX CLI") + chalk.gray(" | Enterprise Agentic Terminal"));
  console.log(line);
  console.log(
    chalk.dim("Workspace: ") + chalk.cyan(process.cwd()) + "\n" +
    chalk.dim("Model:     ") + chalk.yellow(model) +
    (user ? chalk.dim(" | User: ") + chalk.green(user) : "") +
    (org ? chalk.dim(" | Org: ") + chalk.blue(org) : "")
  );
  console.log(line);
}

export function logInfo(msg: string) {
  console.log(chalk.cyan("ℹ ") + msg);
}

export function logSuccess(msg: string) {
  console.log(chalk.green("✔ ") + msg);
}

export function logWarning(msg: string) {
  console.log(chalk.yellow("⚠ ") + msg);
}

export function logError(msg: string) {
  console.log(chalk.red("✖ ") + msg);
}

export function renderToolStart(toolName: string, detail?: string) {
  console.log(chalk.dim("  ● ") + chalk.bold.blue(toolName) + (detail ? chalk.dim(` (${detail})`) : ""));
}

export function renderDiff(filePath: string, diffText: string) {
  console.log("\n" + chalk.bold.underline(`File Preview: ${filePath}`));
  console.log(chalk.gray("─".repeat(60)));
  const lines = diffText.split("\n");
  for (const line of lines) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      console.log(chalk.green(line));
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      console.log(chalk.red(line));
    } else if (line.startsWith("@@")) {
      console.log(chalk.cyan(line));
    } else {
      console.log(chalk.dim(line));
    }
  }
  console.log(chalk.gray("─".repeat(60)));
}
