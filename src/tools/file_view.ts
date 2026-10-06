import * as fs from "fs";
import * as path from "path";

export interface ViewFileOptions {
  filePath: string;
  startLine?: number;
  endLine?: number;
}

export function viewFile(options: ViewFileOptions): { content: string; totalLines: number; error?: string } {
  const fullPath = path.resolve(process.cwd(), options.filePath);
  if (!fs.existsSync(fullPath)) {
    return { content: "", totalLines: 0, error: `File not found: ${options.filePath}` };
  }
  const raw = fs.readFileSync(fullPath, "utf-8");
  const lines = raw.split("\n");
  const totalLines = lines.length;

  const start = Math.max(1, options.startLine || 1);
  const end = Math.min(totalLines, options.endLine || totalLines);

  const sliced = lines.slice(start - 1, end).map((line, idx) => {
    const lineNum = (start + idx).toString().padStart(4, " ");
    return `${lineNum} | ${line}`;
  });

  return {
    content: sliced.join("\n"),
    totalLines
  };
}
