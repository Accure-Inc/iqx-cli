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
      return { valid: false, error: "No API token configured" };
    }
    try {
      const res = await fetch(`${this.apiUrl}/api/v1/user-api-keys`, {
        method: "GET",
        headers: this.getHeaders()
      });
      if (!res.ok) {
        if (res.status === 401) {
          return { valid: false, error: "Invalid or expired API token" };
        }
        return { valid: false, error: `API responded with HTTP ${res.status}` };
      }
      const data = await res.json();
      return { valid: true, user: data };
    } catch (err: any) {
      return { valid: false, error: `Failed to connect to ${this.apiUrl}: ${err.message}` };
    }
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
}
