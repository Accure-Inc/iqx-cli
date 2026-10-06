import { viewFile } from "./file_view";
import { editFile } from "./file_edit";
import { runBash } from "./bash_runner";
import { grepSearch } from "./grep_search";
import { getGitStatus, getGitDiff } from "./git_tools";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export const AVAILABLE_TOOLS: ToolDefinition[] = [
  {
    name: "view_file",
    description: "Read the contents of a file with line numbers",
    parameters: {
      type: "object",
      properties: {
        filePath: { type: "string", description: "Relative path to the file" },
        startLine: { type: "number", description: "Starting line number (1-indexed)" },
        endLine: { type: "number", description: "Ending line number (inclusive)" }
      },
      required: ["filePath"]
    }
  },
  {
    name: "edit_file",
    description: "Perform precise text replacement in a file and generate a diff",
    parameters: {
      type: "object",
      properties: {
        filePath: { type: "string", description: "Path to file" },
        targetContent: { type: "string", description: "Exact string to be replaced" },
        replacementContent: { type: "string", description: "New content to replace target" }
      },
      required: ["filePath", "targetContent", "replacementContent"]
    }
  },
  {
    name: "run_bash",
    description: "Execute a command in the terminal shell (e.g. tests, linters, git)",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command line to execute" }
      },
      required: ["command"]
    }
  },
  {
    name: "grep_search",
    description: "Search for a pattern across project files",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "String or regex pattern to search for" },
        searchPath: { type: "string", description: "Directory to search (defaults to .)" }
      },
      required: ["query"]
    }
  },
  {
    name: "git_status",
    description: "Inspect active git branch and modified files",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "git_diff",
    description: "Inspect uncommitted git diffs across the repository",
    parameters: { type: "object", properties: {} }
  }
];

export async function executeTool(name: string, args: Record<string, any>): Promise<any> {
  switch (name) {
    case "view_file":
      return viewFile({ filePath: args.filePath, startLine: args.startLine, endLine: args.endLine });
    case "edit_file":
      return editFile({ filePath: args.filePath, targetContent: args.targetContent, replacementContent: args.replacementContent });
    case "run_bash":
      return await runBash({ command: args.command });
    case "grep_search":
      return grepSearch({ query: args.query, searchPath: args.searchPath });
    case "git_status":
      return await getGitStatus();
    case "git_diff":
      return await getGitDiff();
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
