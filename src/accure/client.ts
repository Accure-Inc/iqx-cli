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

export class AccureClient {
  private apiUrl: string;
  private token?: string;

  constructor(apiUrl?: string, token?: string) {
    this.apiUrl = (apiUrl || getEffectiveApiUrl()).replace(/\/$/, "");
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

  async validateKey(): Promise<{ valid: boolean; user?: any; error?: string }> {
    if (!this.token) {
      return { valid: false, error: "No API token provided" };
    }

    const testEndpoints = [
      "/api/poe/v1/panels",
      "/api/poe/panels",
      "/api/v1/user-api-keys",
      "/api/user-api-keys"
    ];

    for (const ep of testEndpoints) {
      try {
        const res = await fetch(`${this.apiUrl}${ep}`, {
          method: "GET",
          headers: this.getHeaders()
        });

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          return { valid: true, user: data };
        }

        if (res.status === 401 || res.status === 403) {
          // If explicitly unauthorized on a valid route, continue checking or return error
          if (ep === "/api/poe/v1/panels") {
            return { valid: false, error: "Invalid or expired API token" };
          }
        }
      } catch (err: any) {
        // Network failure to reach this host
        return { valid: false, error: `Could not connect to ${this.apiUrl}: ${err.message}` };
      }
    }

    return { valid: false, error: "Could not verify API token with server" };
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
