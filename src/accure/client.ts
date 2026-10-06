import { getEffectiveToken, getEffectiveApiUrl } from "../core/config";

export interface UserKeyInfo {
  id: string;
  name: string;
  token_preview: string;
  org_id?: string;
  group?: string;
  created_at: string;
  expires_at: string | null;
  status: string;
}

export interface POEPanel {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  status: string;
  team_name?: string;
}

export interface POEExpert {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  status: string;
}

export interface AccureModel {
  id: string; // MongoDB _id
  name: string;
  model_type: "chat" | "vision" | "audio" | string;
  provider: string;
  model_id: string;
  is_default: boolean;
  is_active: boolean;
  description?: string;
}

export interface DefaultModelsSummary {
  chat?: AccureModel;
  vision?: AccureModel;
  audio?: AccureModel;
  all: AccureModel[];
}

export function normalizeApiUrl(rawUrl: string): string {
  let url = (rawUrl || "https://iqx-dev.accure.ai").trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = (url.includes("localhost") || url.includes("127.0.0.1")) ? `http://${url}` : `https://${url}`;
  }
  // Downgrade https:// to http:// for localhost/127.0.0.1 development servers
  if (url.startsWith("https://localhost") || url.startsWith("https://127.0.0.1")) {
    url = url.replace(/^https:\/\//, "http://");
  }
  return url.replace(/\/$/, "");
}

export class AccureClient {
  public apiUrl: string;
  private token?: string;

  constructor(apiUrl?: string, token?: string) {
    this.apiUrl = normalizeApiUrl(apiUrl || getEffectiveApiUrl());
    this.token = token || getEffectiveToken();
  }

  private getCandidateUrls(): string[] {
    const urls = [this.apiUrl];
    if (this.apiUrl.includes(":3000")) {
      urls.push(this.apiUrl.replace(":3000", ":8000"));
    }
    return urls;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (this.token) {
      headers["X-API-Key"] = this.token;
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async validateKey(): Promise<{ valid: boolean; user?: any; error?: string; resolvedUrl?: string }> {
    if (!this.token) {
      return { valid: false, error: "No API token provided" };
    }

    const testEndpoints = [
      "/api/poe/v1/panels",
      "/api/poe/panels",
      "/api/v1/user-api-keys",
      "/api/user-api-keys"
    ];

    let lastError = "";

    for (const host of this.getCandidateUrls()) {
      for (const ep of testEndpoints) {
        try {
          const res = await fetch(`${host}${ep}`, {
            method: "GET",
            headers: this.getHeaders()
          });

          if (res.ok) {
            this.apiUrl = host;
            const data = await res.json().catch(() => ({}));
            return { valid: true, user: data, resolvedUrl: host };
          }

          if (res.status === 401 || res.status === 403) {
            if (ep === "/api/poe/v1/panels") {
              lastError = "Invalid or expired API token";
            }
          }
        } catch (err: any) {
          lastError = `Could not connect to ${host}: ${err.message}`;
        }
      }
    }

    return { valid: false, error: lastError || "Could not verify API token with server" };
  }

  async listModels(): Promise<AccureModel[]> {
    const endpoints = ["/api/poe/v1/models?limit=100", "/v1/models?limit=100"];
    for (const host of this.getCandidateUrls()) {
      for (const ep of endpoints) {
        try {
          const res = await fetch(`${host}${ep}`, {
            method: "GET",
            headers: this.getHeaders()
          });
          if (res.ok) {
            const data = await res.json();
            const list = data.models || data.items || data.data || [];
            return list.map((m: any) => ({
              id: String(m._id || m.id),
              name: m.name || m.model_id,
              model_type: (m.model_type || "chat").toLowerCase(),
              provider: m.provider || "accure",
              model_id: m.model_id,
              is_default: Boolean(m.is_default),
              is_active: m.is_active !== undefined ? Boolean(m.is_active) : true,
              description: m.description
            }));
          }
        } catch {}
      }
    }
    return [];
  }

  async fetchDefaultModels(): Promise<DefaultModelsSummary> {
    const models = await this.listModels();
    const active = models.filter(m => m.is_active);

    const chatModels = active.filter(m => m.model_type === "chat");
    const visionModels = active.filter(m => m.model_type === "vision");
    const audioModels = active.filter(m => m.model_type === "audio");

    const defaultChat = chatModels.find(m => m.is_default) || chatModels[0];
    const defaultVision = visionModels.find(m => m.is_default) || visionModels[0];
    const defaultAudio = audioModels.find(m => m.is_default) || audioModels[0];

    return {
      chat: defaultChat,
      vision: defaultVision,
      audio: defaultAudio,
      all: models
    };
  }

  async askStream(
    query: string,
    modelId?: string,
    onToken?: (token: string) => void
  ): Promise<{ content: string }> {
    const endpoints = ["/api/ask/ask_stream", "/api/chat"];
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const payload: Record<string, any> = {
      query,
      message: query,
      job_id: jobId,
      model: (modelId && modelId !== "default" && modelId !== "accure-enterprise") ? modelId : null,
      panel_id: null,
      panel_type: null,
      file_refs: null,
      mentions: [],
      memory_access: false,
      memory_creation: false,
      knowledge_access: true,
      audit_level: "basic"
    };

    let lastError = "";

    for (const host of this.getCandidateUrls()) {
      for (const ep of endpoints) {
        try {
          const res = await fetch(`${host}${ep}`, {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify(payload)
          });

          if (!res.ok) {
            const err = await res.text();
            lastError = `Accure Gateway (${host}${ep}) returned ${res.status}: ${err}`;
            continue;
          }

          if (!res.body) {
            throw new Error("No response body received from server");
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let fullGeneratedText = "";
          let collectedTokens: string[] = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const dataStr = trimmed.slice(5).trim();
              if (!dataStr || dataStr === "[DONE]") continue;

              try {
                const parsed = JSON.parse(dataStr);

                // 1. Authoritative full generated text
                if (parsed.generated_text && typeof parsed.generated_text === "string") {
                  fullGeneratedText = parsed.generated_text;
                }

                // 2. Incremental streaming token
                let tokenText = "";
                if (parsed.token?.text) {
                  tokenText = parsed.token.text;
                } else if (parsed.content && typeof parsed.content === "string") {
                  tokenText = parsed.content;
                } else if (parsed.text && typeof parsed.text === "string" && !parsed.is_full_text) {
                  tokenText = parsed.text;
                }

                if (tokenText) {
                  collectedTokens.push(tokenText);
                  if (onToken) {
                    onToken(tokenText);
                  }
                }
              } catch {
                // Ignore partial or non-json SSE lines
              }
            }
          }

          const finalContent = fullGeneratedText || collectedTokens.join("");
          if (finalContent && finalContent.trim()) {
            return { content: finalContent.trim() };
          }
          return { content: finalContent || "(Completed with no text output)" };
        } catch (err: any) {
          lastError = err.message;
        }
      }
    }

    throw new Error(lastError || "Failed to receive response from AccureIQx ask_stream service");
  }

  async queryUCG(prompt: string, limit: number = 5): Promise<any> {
    for (const host of this.getCandidateUrls()) {
      try {
        const res = await fetch(`${host}/api/ucg/search`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({ query: prompt, limit })
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {}
    }
    throw new Error("Failed to query UCG");
  }

  async listPanels(): Promise<POEPanel[]> {
    const endpoints = ["/api/poe/v1/panels", "/api/poe/panels"];
    for (const host of this.getCandidateUrls()) {
      for (const ep of endpoints) {
        try {
          const res = await fetch(`${host}${ep}`, {
            method: "GET",
            headers: this.getHeaders()
          });
          if (res.ok) {
            const data = await res.json();
            return data.items || data.data || [];
          }
        } catch {}
      }
    }
    throw new Error("Failed to fetch panels");
  }

  async listExperts(): Promise<POEExpert[]> {
    const endpoints = ["/api/poe/v1/experts", "/api/poe/experts"];
    for (const host of this.getCandidateUrls()) {
      for (const ep of endpoints) {
        try {
          const res = await fetch(`${host}${ep}`, {
            method: "GET",
            headers: this.getHeaders()
          });
          if (res.ok) {
            const data = await res.json();
            return data.items || data.data || [];
          }
        } catch {}
      }
    }
    throw new Error("Failed to fetch experts");
  }
}
