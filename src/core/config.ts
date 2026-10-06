import os from "os";
import path from "path";
import Conf from "conf";

export interface IQXConfig {
  api_token?: string;
  api_url: string;
  default_model: string;
  active_model_name?: string;
  chat_model_id?: string;
  chat_model_name?: string;
  vision_model_id?: string;
  vision_model_name?: string;
  audio_model_id?: string;
  audio_model_name?: string;
  sandbox_mode: "strict" | "workspace" | "autonomous";
  user_id?: string;
  org_id?: string;
  group?: string;
  user_email?: string;
}

const defaults: IQXConfig = {
  api_url: process.env.IQX_API_URL || "https://iqx-dev.accure.ai",
  default_model: process.env.IQX_MODEL || "accure-enterprise",
  sandbox_mode: "strict"
};

export const configStore = new Conf<IQXConfig>({
  cwd: path.join(os.homedir(), ".iqx"),
  configName: "config",
  defaults
});

export function getEffectiveToken(): string | undefined {
  const token = process.env.IQX_API_TOKEN || configStore.get("api_token");
  return token && token.trim() ? token.trim() : undefined;
}

export function getEffectiveApiUrl(): string {
  const url = process.env.IQX_API_URL || configStore.get("api_url") || "https://iqx-dev.accure.ai";
  return url.replace(/\/$/, "");
}

export function getActiveModel(): { id: string; name?: string } {
  const id = process.env.IQX_MODEL || configStore.get("default_model") || "accure-enterprise";
  const name = configStore.get("active_model_name") || configStore.get("chat_model_name");
  return { id, name };
}
