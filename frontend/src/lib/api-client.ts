function getBackendUrl(): string {
  // Server-side: use BACKEND_URL runtime env var (e.g., http://backend:4000 inside Docker)
  if (typeof window === 'undefined') {
    return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  }
  // Client-side: use NEXT_PUBLIC_BACKEND_URL (inlined at build time, browser-accessible)
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
}

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders as Record<string, string>,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${getBackendUrl()}${path}`, {
    headers,
    ...rest,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiError(res.status, body.error || 'Request failed');
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Auth
export interface AuthResponse {
  token: string;
  user: { id: string; email: string; name: string };
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiRegister(name: string, email: string, password: string): Promise<AuthResponse> {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function apiGetMe(token: string) {
  return apiFetch<{ user: { id: string; email: string; name: string } }>('/api/auth/me', { token });
}

// Categories
export async function apiGetCategories() {
  return apiFetch<any[]>('/api/categories');
}

export async function apiGetCategoryBySlug(slug: string) {
  return apiFetch<any>(`/api/categories/${slug}`);
}

// Products
export async function apiGetFeaturedProducts(limit = 8) {
  return apiFetch<any[]>(`/api/products?featured=true&limit=${limit}`);
}

export async function apiGetProductBySlug(slug: string) {
  return apiFetch<any>(`/api/products/${slug}`);
}

export async function apiGetRelatedProducts(slug: string, limit = 4) {
  return apiFetch<any[]>(`/api/products/${slug}/related?limit=${limit}`);
}

export async function apiSearchProducts(query: string) {
  return apiFetch<any[]>(`/api/products?q=${encodeURIComponent(query)}`);
}

// Orders
export async function apiPlaceOrder(items: any[], address: string, token: string) {
  return apiFetch<{ success: boolean; orderId: string }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify({ items, address }),
    token,
  });
}

export async function apiGetOrderHistory(token: string) {
  return apiFetch<any[]>('/api/orders', { token });
}
