import { createBrowserClient } from "@supabase/ssr";

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  return url;
}

function getSupabaseKey() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!key) {
    throw new Error("Missing Supabase public key");
  }

  return key;
}

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseKey());
}