import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly in development instead of silently making broken
  // requests, since a missing .env file is a common first mistake.
  throw new Error(
    "Missing Supabase env vars. Check that .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart `npm run dev`."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
