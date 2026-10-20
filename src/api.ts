/**
 * Safe API client for Projevo AI
 * Prevents JSON parsing crashes on HTML / non-JSON server responses
 * and extracts user-friendly error messages.
 */
export async function safeApiFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const mergedOptions: RequestInit = {
    credentials: 'include',
    ...options,
  };
  let res: Response;
  try {
    res = await fetch(url, mergedOptions);
  } catch (netErr: any) {
    throw new Error('Network error. Please check your internet connection.');
  }

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    // Safe non-JSON response handling (e.g. plain text or HTML 404/500 pages)
    await res.text().catch(() => '');
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('The requested service was not found. Please try again later.');
      }
      if (res.status >= 500) {
        throw new Error('An unexpected server error occurred. Please try again later.');
      }
      throw new Error(`Request failed with status ${res.status}.`);
    }
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}
