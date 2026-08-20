import { createClient as createBrowserSupabaseClient } from "./supabase/client";

// Global single instance for client-side components
export const supabase = createBrowserSupabaseClient();
export default supabase;
