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
  default_model: process.env.IQX_MODEL || "accure-enterprise",
  sandbox_mode: "strict"
};

export const configStore = new Conf<IQXConfig>({
  projectName: "iqx-cli",
  projectSuffix: "",
  defaults
});

export function getEffectiveToken(): string | undefined {
  const token = process.env.IQX_API_TOKEN || configStore.get("api_token");
  return token && token.trim() ? token.trim() : undefined;
}

export function getEffectiveApiUrl(): string {
  const url = process.env.IQX_API_URL || configStore.get("api_url") || "http://localhost:8000";
  return url.replace(/\/$/, "");
}
