import { env } from './env';

const BASE_URL = env.API_URL;

// ngrok free tier injects a browser warning page for non-browser requests.
// This header bypasses it.
const BASE_HEADERS: Record<string, string> = {
  'ngrok-skip-browser-warning': '1',
};

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
  getMeals: (skip = 0, limit = 20, fromDate?: string, toDate?: string): Promise<MealsResponse> => {
    let url = `${BASE_URL}/meals?skip=${skip}&limit=${limit}`;
    if (fromDate) url += `&from_date=${fromDate}`;
    if (toDate) url += `&to_date=${toDate}`;
    return fetch(url, { headers: BASE_HEADERS }).then((r) => handleResponse<MealsResponse>(r));
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
    const response = await fetch(`${BASE_URL}/meals/detect-menu`, {
      method: 'POST',
      headers: BASE_HEADERS,
      body: form,
    });
    return handleResponse<DetectMenuResponse>(response);
  },

  generateReviews: (
    menuName: string,
    restaurantName: string,
    rating: number,
    sessionId?: string,
    imagePath?: string,
  ): Promise<GenerateReviewsResponse> =>
    fetch(`${BASE_URL}/meals/generate-reviews`, {
      method: 'POST',
      headers: { ...BASE_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_name: menuName,
        restaurant_name: restaurantName,
        rating,
        session_id: sessionId ?? null,
        image_path: imagePath ?? null,
      }),
    }).then((r) => handleResponse<GenerateReviewsResponse>(r)),

  createMeal: (formData: FormData): Promise<Meal> =>
    fetch(`${BASE_URL}/meals`, { method: 'POST', headers: BASE_HEADERS, body: formData }).then((r) =>
      handleResponse<Meal>(r),
    ),

  searchMeals: (q: string): Promise<Meal[]> =>
    fetch(`${BASE_URL}/search?q=${encodeURIComponent(q)}`, { headers: BASE_HEADERS }).then((r) =>
      handleResponse<Meal[]>(r),
    ),

  getRestaurants: (name?: string): Promise<Restaurant[]> => {
    const url = name
      ? `${BASE_URL}/restaurants?name=${encodeURIComponent(name)}`
      : `${BASE_URL}/restaurants`;
    return fetch(url, { headers: BASE_HEADERS }).then((r) => handleResponse<Restaurant[]>(r));
  },

  searchNearbyRestaurants: (q: string, lat?: number, lng?: number): Promise<NearbyRestaurant[]> => {
    let url = `${BASE_URL}/restaurants/search-nearby?q=${encodeURIComponent(q)}`;
    if (lat != null && lng != null) url += `&lat=${lat}&lng=${lng}`;
    return fetch(url, { headers: BASE_HEADERS }).then((r) => handleResponse<NearbyRestaurant[]>(r));
  },

  getRestaurantMenus: (restaurantName: string, sessionId?: string): Promise<string[]> => {
    let url = `${BASE_URL}/restaurants/menus?name=${encodeURIComponent(restaurantName)}`;
    if (sessionId) {
      url += `&session_id=${encodeURIComponent(sessionId)}`;
    }
    return fetch(url, { headers: BASE_HEADERS }).then((r) => handleResponse<string[]>(r));
  },

  deleteMeal: (id: number): Promise<void> =>
    fetch(`${BASE_URL}/meals/${id}`, { method: 'DELETE', headers: BASE_HEADERS }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    }),

  geocodeAllRestaurants: (): Promise<{ updated: number; total: number }> =>
    fetch(`${BASE_URL}/restaurants/geocode-all`, { method: 'POST', headers: BASE_HEADERS }).then(
      (r) => handleResponse<{ updated: number; total: number }>(r),
    ),
};
