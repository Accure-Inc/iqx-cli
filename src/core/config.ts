import Conf from "conf";

export interface IQXConfig {
  api_token?: string;
  api_url: string;
  default_model: string;
  sandbox_mode: "strict" | "workspace" | "autonomous";
  user_id?: string;
  org_id?: string;
  group?: string;
  user_email?: string;
}

const defaults: IQXConfig = {
  api_url: process.env.IQX_API_URL || "http://localhost:8000",
  default_model: process.env.IQX_MODEL || "claude-3-7-sonnet",
  sandbox_mode: "strict"
};

export const configStore = new Conf<IQXConfig>({
  projectName: "iqx-cli",
  projectSuffix: "",
  defaults
});

export function getEffectiveToken(): string | undefined {
  return process.env.IQX_API_TOKEN || configStore.get("api_token");
}

export function getEffectiveApiUrl(): string {
  return process.env.IQX_API_URL || configStore.get("api_url") || "http://localhost:8000";
}
