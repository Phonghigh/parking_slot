const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const TOKEN_KEY = 'parksmart_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Lỗi ${res.status}`);
  return data as T;
}

export type Role = 'commuter' | 'owner';

export interface User {
  id: number;
  name: string;
  username: string;
  role: Role;
  wallet_balance: number;
}

export interface Review {
  id: number;
  user_id?: number | null;
  user_name: string;
  rating: number;
  comment: string;
  updated_at?: number | null;
}

export interface Lot {
  id: number;
  owner_id: number;
  name: string;
  lat: number;
  lng: number;
  address: string;
  image_url: string;
  pricing_type: 'hourly' | 'flat';
  price_per_hour: number;
  flat_price: number;
  total_spots: number;
  available_spots: number;
  covered: boolean;
  rating: number;
  review_count: number;
  amenities: string[];
  open_hours: string;
  is_open: boolean;
  distance?: number | null;
  reviews?: Review[];
}

export interface Session {
  id: number;
  lot_id: number;
  user_id: number;
  plate: string;
  slot_label: string | null;
  checkin_at: number;
  checkout_at: number | null;
  status: 'active' | 'completed';
  checkout_token: string;
  short_code: string | null;
  fee: number | null;
  payment_method: 'momo' | 'wallet' | 'cash' | null;
  estimate_fee: number;
  lot: {
    id: number;
    name: string;
    address: string;
    pricing_type: 'hourly' | 'flat';
    price_per_hour: number;
    flat_price: number;
  };
}

export interface ActivityEvent {
  type: 'checkin' | 'checkout';
  plate: string;
  slot: string | null;
  ts: number;
  status?: string;
  fee?: number | null;
}

export interface OwnerStats {
  available: number;
  total: number;
  occupancyPct: number;
  currentVehicles: number;
  todayEarnings: number;
  earningsDeltaPct: number | null;
  checkinsToday: number;
  avgStayHours: number;
  hourly: { label: string; count: number }[];
  recent: ActivityEvent[];
}

export const api = {
  // auth
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (payload: { name: string; username: string; password: string; role: Role }) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  me: () => request<{ user: User }>('/auth/me'),

  // lots
  listLots: (lat?: number, lng?: number) => {
    const q = lat != null && lng != null ? `?lat=${lat}&lng=${lng}` : '';
    return request<{ lots: Lot[] }>(`/lots${q}`);
  },
  getLot: (id: number) => request<{ lot: Lot }>(`/lots/${id}`),
  submitReview: (lotId: number, rating: number, comment: string) =>
    request<{ lot: Lot; edited: boolean }>(`/lots/${lotId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    }),
  ownerLots: () => request<{ lots: Lot[] }>('/owner/lots'),
  ownerLot: () => request<{ lot: Lot }>('/owner/lot'),
  ownerStats: () => request<{ lot: Lot; stats: OwnerStats }>('/owner/stats'),
  ownerSetCapacity: (available_spots: number) =>
    request<{ lot: Lot }>('/owner/lot/capacity', {
      method: 'PATCH',
      body: JSON.stringify({ available_spots }),
    }),

  // sessions
  checkin: (lotId: number, userId: number, plate: string) =>
    request<{ session: Session }>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ lotId, userId, plate }),
    }),
  activeSession: () => request<{ session: Session | null }>('/sessions/active'),
  activeSessions: () => request<{ sessions: Session[] }>('/sessions/active-list'),
  getSession: (id: number) => request<{ session: Session }>(`/sessions/${id}`),
  history: () => request<{ sessions: Session[] }>('/sessions/history'),
  setPayment: (id: number, payment_method: string) =>
    request<{ session: Session }>(`/sessions/${id}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_method }),
    }),
  // Tra cứu phiên checkout bằng token (QR) HOẶC mã ngắn người dùng đọc
  lookupByToken: (q: string) =>
    request<{ session: Session }>(`/sessions/lookup?q=${encodeURIComponent(q)}`),
  // Dự phòng: tra phiên đang gửi theo biển số (khách mất/hết pin điện thoại)
  findByPlate: (plate: string) =>
    request<{ session: Session }>(`/sessions/find?plate=${encodeURIComponent(plate)}`),
  checkout: (id: number, plate: string) =>
    request<{ session: Session; fee: number; payment_method: string }>(
      `/sessions/${id}/checkout`,
      { method: 'POST', body: JSON.stringify({ plate }) }
    ),
};
