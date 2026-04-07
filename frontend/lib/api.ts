import { env } from './env';
import { supabase } from './supabase';

const BASE_URL = env.API_URL;

// ngrok free tier injects a browser warning page for non-browser requests.
// This header bypasses it.
async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'ngrok-skip-browser-warning': '1' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

export interface NearbyRestaurant {
  name: string;
  display_name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface Restaurant {
  id: number;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Meal {
  id: number;
  menu_name: string;
  restaurant: Restaurant;
  rating: number | null;
  review: string | null;
  tags: string[] | null;
  image_url: string | null;
  created_at: string;
}

export interface MealsResponse {
  meals: Meal[];
  stats: {
    total_meals: number;
    total_restaurants: number;
    avg_rating: number | null;
  };
}

export interface DetectMenuResponse {
  candidates: string[];
  session_id: string | null;
  image_path: string | null;  // server-side path, passed to generate-reviews
}

export interface GenerateReviewsResponse {
  reviews: string[];
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(
      typeof errorBody.detail === 'string' ? errorBody.detail : `HTTP ${response.status}`,
    );
  }
  return response.json() as Promise<T>;
}

export const api = {
  getMeals: async (skip = 0, limit = 20, fromDate?: string, toDate?: string): Promise<MealsResponse> => {
    let url = `${BASE_URL}/meals?skip=${skip}&limit=${limit}`;
    if (fromDate) url += `&from_date=${fromDate}`;
    if (toDate) url += `&to_date=${toDate}`;
    const headers = await getAuthHeaders();
    return fetch(url, { headers }).then((r) => handleResponse<MealsResponse>(r));
  },

  detectMenu: async (
    imageUri: string,
    restaurantName: string,
    sessionId?: string,
  ): Promise<DetectMenuResponse> => {
    const form = new FormData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.append('image', { uri: imageUri, type: 'image/jpeg', name: 'photo.jpg' } as any);
    form.append('restaurant_name', restaurantName);
    if (sessionId) {
      form.append('session_id', sessionId);
    }
    // detect-menu does not require auth (no DB access)
    const response = await fetch(`${BASE_URL}/meals/detect-menu`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': '1' },
      body: form,
    });
    return handleResponse<DetectMenuResponse>(response);
  },

  generateReviews: async (
    menuName: string,
    restaurantName: string,
    rating: number,
    sessionId?: string,
    imagePath?: string,
  ): Promise<GenerateReviewsResponse> => {
    // generate-reviews does not require auth (no DB access)
    const response = await fetch(`${BASE_URL}/meals/generate-reviews`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': '1', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_name: menuName,
        restaurant_name: restaurantName,
        rating,
        session_id: sessionId ?? null,
        image_path: imagePath ?? null,
      }),
    });
    return handleResponse<GenerateReviewsResponse>(response);
  },

  createMeal: async (formData: FormData): Promise<Meal> => {
    const headers = await getAuthHeaders();
    return fetch(`${BASE_URL}/meals`, { method: 'POST', headers, body: formData }).then((r) =>
      handleResponse<Meal>(r),
    );
  },

  searchMeals: async (q: string): Promise<Meal[]> => {
    const headers = await getAuthHeaders();
    return fetch(`${BASE_URL}/search?q=${encodeURIComponent(q)}`, { headers }).then((r) =>
      handleResponse<Meal[]>(r),
    );
  },

  getRestaurants: async (name?: string): Promise<Restaurant[]> => {
    const url = name
      ? `${BASE_URL}/restaurants?name=${encodeURIComponent(name)}`
      : `${BASE_URL}/restaurants`;
    const headers = await getAuthHeaders();
    return fetch(url, { headers }).then((r) => handleResponse<Restaurant[]>(r));
  },

  searchNearbyRestaurants: async (q: string, lat?: number, lng?: number): Promise<NearbyRestaurant[]> => {
    let url = `${BASE_URL}/restaurants/search-nearby?q=${encodeURIComponent(q)}`;
    if (lat != null && lng != null) url += `&lat=${lat}&lng=${lng}`;
    const headers = await getAuthHeaders();
    return fetch(url, { headers }).then((r) => handleResponse<NearbyRestaurant[]>(r));
  },

  getRestaurantMenus: async (restaurantName: string, sessionId?: string): Promise<string[]> => {
    let url = `${BASE_URL}/restaurants/menus?name=${encodeURIComponent(restaurantName)}`;
    if (sessionId) {
      url += `&session_id=${encodeURIComponent(sessionId)}`;
    }
    const headers = await getAuthHeaders();
    return fetch(url, { headers }).then((r) => handleResponse<string[]>(r));
  },

  deleteMeal: async (id: number): Promise<void> => {
    const headers = await getAuthHeaders();
    return fetch(`${BASE_URL}/meals/${id}`, { method: 'DELETE', headers }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    });
  },

  geocodeAllRestaurants: async (): Promise<{ updated: number; total: number }> => {
    const headers = await getAuthHeaders();
    return fetch(`${BASE_URL}/restaurants/geocode-all`, { method: 'POST', headers }).then((r) =>
      handleResponse<{ updated: number; total: number }>(r),
    );
  },
};
