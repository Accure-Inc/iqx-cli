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

export function normalizeApiUrl(rawUrl: string): string {
  let url = (rawUrl || "http://localhost:8000").trim();
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

    // If port 3000 (web frontend) was entered, test port 8000 (backend API) too
    const candidateUrls = [this.apiUrl];
    if (this.apiUrl.includes(":3000")) {
      candidateUrls.push(this.apiUrl.replace(":3000", ":8000"));
    }

    const testEndpoints = [
      "/api/poe/v1/panels",
      "/api/poe/panels",
      "/api/v1/user-api-keys",
      "/api/user-api-keys"
    ];

    let lastError = "";

    for (const host of candidateUrls) {
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

  async queryUCG(prompt: string, limit: number = 5): Promise<any> {
    const res = await fetch(`${this.apiUrl}/api/ucg/search`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ query: prompt, limit })
    });
    if (!res.ok) throw new Error(`UCG query failed: ${res.statusText}`);
    return await res.json();
  }

  async listPanels(): Promise<POEPanel[]> {
    const endpoints = ["/api/poe/v1/panels", "/api/poe/panels"];
    for (const ep of endpoints) {
      try {
        const res = await fetch(`${this.apiUrl}${ep}`, {
          method: "GET",
          headers: this.getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          return data.items || data.data || [];
        }
      } catch {
        // try next
      }
    }
    throw new Error("Failed to fetch panels");
  }

  async listExperts(): Promise<POEExpert[]> {
    const endpoints = ["/api/poe/v1/experts", "/api/poe/experts"];
    for (const ep of endpoints) {
      try {
        const res = await fetch(`${this.apiUrl}${ep}`, {
          method: "GET",
          headers: this.getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          return data.items || data.data || [];
        }
      } catch {
        // try next
      }
    }
    throw new Error("Failed to fetch experts");
  }
}
