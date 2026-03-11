import { createBrowserClient } from "@supabase/ssr";

const FALLBACK_URL = "https://placeholder.supabase.co";
const FALLBACK_KEY = "placeholder-key";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseUrl =
    url && url.startsWith("http") && url !== "your-supabase-url-here"
      ? url
      : FALLBACK_URL;

  const supabaseKey =
    key && key !== "your-supabase-anon-key-here" ? key : FALLBACK_KEY;

  return createBrowserClient(supabaseUrl, supabaseKey);
}
