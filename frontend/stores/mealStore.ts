import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { api } from '@/lib/api';
import type { Meal } from '@/lib/api';

export type { Meal };

interface MealStats {
  total_meals: number;
  total_restaurants: number;
  avg_rating: number | null;
}

interface MealState {
  meals: Meal[];
  isLoading: boolean;
  stats: MealStats;
  fetchMeals: () => Promise<void>;
  addMeal: (meal: Meal) => void;
}

const DEFAULT_STATS: MealStats = {
  total_meals: 0,
  total_restaurants: 0,
  avg_rating: null,
};

export const useMealStore = create<MealState>()(
  persist(
    (set) => ({
      meals: [],
      isLoading: false,
      stats: DEFAULT_STATS,
      fetchMeals: async () => {
        set({ isLoading: true });
        try {
          const data = await api.getMeals();
          set({ meals: data.meals, stats: data.stats, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      addMeal: (meal: Meal) =>
        set((state) => ({
          meals: [meal, ...state.meals],
          stats: {
            ...state.stats,
            total_meals: state.stats.total_meals + 1,
          },
        })),
    }),
    {
      name: 'meal-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ meals: state.meals, stats: state.stats }),
    },
  ),
);
