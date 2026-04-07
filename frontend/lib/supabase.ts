import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = (Constants.expoConfig?.extra?.SUPABASE_URL as string) ?? '';
const supabaseAnonKey = (Constants.expoConfig?.extra?.SUPABASE_ANON_KEY as string) ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
