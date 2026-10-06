import * as fs from "fs";
import * as path from "path";
import * as diff from "diff";

export interface EditFileOptions {
  filePath: string;
  targetContent: string;
  replacementContent: string;
}

export function editFile(options: EditFileOptions): { success: boolean; diffText?: string; error?: string } {
  const fullPath = path.resolve(process.cwd(), options.filePath);
  if (!fs.existsSync(fullPath)) {
    return { success: false, error: `File not found: ${options.filePath}` };
  }
  const original = fs.readFileSync(fullPath, "utf-8");

  if (!original.includes(options.targetContent)) {
    return {
      success: false,
      error: `Target content not found in file: ${options.filePath}. Please ensure exact whitespace matching.`
    };
  }

  const modified = original.replace(options.targetContent, options.replacementContent);
  const patch = diff.createPatch(options.filePath, original, modified, "original", "modified");

  fs.writeFileSync(fullPath, modified, "utf-8");

  return {
    success: true,
    diffText: patch
  };
}
