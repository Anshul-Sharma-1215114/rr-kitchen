import { getApiUrl } from "./api-url";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error ?? "Something went wrong", res.status);
  }

  return data as T;
}

// For multipart uploads (menu item/combo images) — no Content-Type header
// so the browser sets the multipart boundary itself.
export async function apiUpload<T>(path: string, formData: FormData, method: "POST" | "PATCH" = "POST"): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`, { method, credentials: "include", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Something went wrong", res.status);
  return data as T;
}
