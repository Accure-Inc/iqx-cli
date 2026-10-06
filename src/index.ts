#!/usr/bin/env bun
import { Command } from "commander";
import { authCommand } from "./commands/auth";
import { configCommand } from "./commands/config";
import { chatCommand, startChatSession } from "./commands/chat";
import { ucgCommand } from "./commands/ucg";
import { expertCommand } from "./commands/expert";
import { modelsCommand } from "./commands/models";
import { uninstallCommand } from "./commands/uninstall";
import { Agent } from "./core/agent";
import { configStore, getActiveModel } from "./core/config";
import { renderBanner } from "./core/terminal";
import { ensureAuthenticated } from "./core/auth_guard";

const program = new Command();

program
  .name("iqx")
  .description("Cross-platform autonomous agentic CLI for local pair programming & Accure Enterprise AI")
  .version("0.1.0")
  .option("-m, --model <model>", "Model to use (AccureIQx Model ID or name)")
  .option("-y, --yes", "Auto-approve all tool actions (autonomous mode)")
  .option("-p, --pipe <prompt>", "Run non-interactively in headless pipe mode")
  .argument("[prompt...]", "Task or coding prompt to execute immediately")
  .action(async (promptArgs, options) => {
    let prompt = options.pipe || promptArgs.join(" ").trim();
    const active = getActiveModel();
    const model = options.model || active.id || "accure-enterprise";

    // Read from standard input if piped (e.g. cat file.txt | iqx "check this")
    if (!process.stdin.isTTY && !options.pipe) {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      const stdinData = Buffer.concat(chunks).toString("utf-8").trim();
      if (stdinData) {
        prompt = prompt ? `${prompt}\n\nContext from stdin:\n` + stdinData : stdinData;
      }
    }

    if (!prompt) {
      // Interactive chat session - prompts for login on first launch
      await ensureAuthenticated();
      await startChatSession({ model, yes: options.yes });
      return;
    }

    // Direct execution
    await ensureAuthenticated();
    renderBanner(model);
    const agent = new Agent({
      model,
      autoApprove: options.yes
    });

    await agent.run(prompt);
  });

program.addCommand(authCommand);
program.addCommand(configCommand);
program.addCommand(chatCommand);
program.addCommand(ucgCommand);
program.addCommand(expertCommand);
program.addCommand(modelsCommand);
program.addCommand(uninstallCommand);

program.parse(process.argv);
