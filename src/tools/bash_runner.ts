import { exec } from "child_process";
import * as os from "os";

export interface BashOptions {
  command: string;
  cwd?: string;
  timeoutMs?: number;
}

export interface BashResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export function runBash(options: BashOptions): Promise<BashResult> {
  const start = Date.now();
  const cwd = options.cwd || process.cwd();
  const isWindows = os.platform() === "win32";
  const shell = isWindows ? "powershell.exe" : (process.env.SHELL || "/bin/bash");

  return new Promise((resolve) => {
    exec(
      options.command,
      {
        cwd,
        shell,
        timeout: options.timeoutMs || 60000,
        maxBuffer: 10 * 1024 * 1024
      },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - start;
        const exitCode = error && typeof error.code === "number" ? error.code : (error ? 1 : 0);
        resolve({
          stdout: stdout.toString(),
          stderr: stderr.toString(),
          exitCode,
          durationMs
        });
      }
    );
  });
}
