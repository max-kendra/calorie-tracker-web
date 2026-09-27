const API_KEY_STORAGE_KEY = "meal-tracker-api-key";

export function getStoredApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function setStoredApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export function clearStoredApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Invalid or missing API key");
    this.name = "UnauthorizedError";
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiKey = getStoredApiKey();
  const isFormData = init.body instanceof FormData;
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      "X-API-Key": apiKey ?? "",
      ...init.headers,
    },
  });

  if (response.status === 401) {
    throw new UnauthorizedError();
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText}${detail ? `: ${detail}` : ""}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  /** Uploads a single file as multipart/form-data under the field name
   * the backend expects ("image" for all three /items/scan-* endpoints
   * - see app/routers/items.py's UploadFile = File(...) parameters). */
  postFile: <T>(path: string, file: File, fieldName = "image") => {
    const formData = new FormData();
    formData.append(fieldName, file);
    return request<T>(path, { method: "POST", body: formData });
  },
};