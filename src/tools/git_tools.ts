import { simpleGit, type SimpleGit } from "simple-git";

const git: SimpleGit = simpleGit(process.cwd());

export async function isGitRepository(): Promise<boolean> {
  try {
    return await git.checkIsRepo();
  } catch {
    return false;
  }
}

export async function getGitStatus(): Promise<string> {
  if (!(await isGitRepository())) return "Not a git repository.";
  const status = await git.status();
  const summary: string[] = [];
  if (status.current) summary.push(`Branch: ${status.current}`);
  if (status.modified.length) summary.push(`Modified: ${status.modified.join(", ")}`);
  if (status.not_added.length) summary.push(`Untracked: ${status.not_added.join(", ")}`);
  if (status.deleted.length) summary.push(`Deleted: ${status.deleted.join(", ")}`);
  return summary.join("\n");
}

export async function getGitDiff(): Promise<string> {
  if (!(await isGitRepository())) return "";
  return await git.diff();
}

export async function createCommit(message: string): Promise<string> {
  if (!(await isGitRepository())) throw new Error("Not a git repository.");
  await git.add(".");
  const res = await git.commit(message);
  return res.commit || "Committed successfully";
}
