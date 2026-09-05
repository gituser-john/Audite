/**
 * Centralized API client wrapper with authentication and base URL resolution.
 */

export const API_BASE_URL: string = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/+$/, "")

/**
 * Executes an HTTP fetch request prepending the configured API base URL
 * and automatically injecting the Clerk JWT Bearer token.
 *
 * Automatically handles application/json for object bodies while preserving
 * browser-managed multipart boundaries for FormData uploads.
 */
export async function fetchWithAuth(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  const url = endpoint.startsWith("http://") || endpoint.startsWith("https://")
    ? endpoint
    : `${API_BASE_URL}${normalizedEndpoint}`

  const headers = new Headers(options.headers || {})
  headers.set("Authorization", `Bearer ${token}`)

  // Only set Content-Type to JSON if body exists, isn't FormData, and isn't already specified
  if (
    options.body &&
    !(typeof FormData !== "undefined" && options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json")
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * Backward-compatible alias for fetchWithAuth.
 */
export const authenticatedFetch = fetchWithAuth
