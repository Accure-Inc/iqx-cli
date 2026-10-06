import * as fs from "fs";
import * as path from "path";

export interface GrepOptions {
  query: string;
  searchPath?: string;
  isRegex?: boolean;
  maxResults?: number;
}

export interface GrepMatch {
  file: string;
  line: number;
  content: string;
}

export function grepSearch(options: GrepOptions): GrepMatch[] {
  const root = path.resolve(process.cwd(), options.searchPath || ".");
  const maxResults = options.maxResults || 50;
  const matches: GrepMatch[] = [];

  const regex = options.isRegex
    ? new RegExp(options.query, "i")
    : new RegExp(options.query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");

  function scan(dir: string) {
    if (matches.length >= maxResults) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (matches.length >= maxResults) return;
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (
          entry.name === "node_modules" ||
          entry.name === ".git" ||
          entry.name === "dist" ||
          entry.name === "bin" ||
          entry.name === ".venv"
        ) {
          continue;
        }
        scan(full);
      } else if (entry.isFile()) {
        try {
          const content = fs.readFileSync(full, "utf-8");
          const lines = content.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              const rel = path.relative(process.cwd(), full);
              matches.push({
                file: rel,
                line: i + 1,
                content: lines[i].trim()
              });
              if (matches.length >= maxResults) break;
            }
          }
        } catch {
          // Skip binary or unreadable files
        }
      }
    }
  }

  scan(root);
  return matches;
}
