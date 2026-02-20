import { ApiError } from "./errors.js";

export interface HttpClientConfig {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly getToken: () => Promise<string | null>;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.getToken = config.getToken;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (!this.baseUrl) {
      throw new ApiError(
        "MISSING_CONFIG",
        "CANDOO_API_URL is not set. Set it to your Supabase Edge Functions URL.",
        0,
      );
    }

    const token = await this.getToken();
    if (!token) {
      throw new ApiError("UNAUTHORIZED", "Not logged in", 401);
    }

    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);

    if (!res.ok) {
      let code = "UNKNOWN";
      let message = res.statusText;
      try {
        const errorBody = (await res.json()) as {
          error?: { code?: string; message?: string };
        };
        if (errorBody.error) {
          code = errorBody.error.code ?? code;
          message = errorBody.error.message ?? message;
        }
      } catch {
        // Use defaults if body isn't JSON
      }
      throw new ApiError(code, message, res.status);
    }

    return (await res.json()) as T;
  }
}
