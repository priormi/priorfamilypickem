import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

async function functionErrorMessage(error: unknown) {
  const context = error && typeof error === "object" && "context" in error ? error.context : null;

  if (context instanceof Response) {
    try {
      const body = (await context.clone().json()) as { message?: string };
      if (body.message) return body.message;
    } catch {
      // Fall through to the SDK error message.
    }
  }

  return error instanceof Error ? error.message : "Request failed.";
}

export async function callFunction<T>(name: string, body: Record<string, unknown>, token?: string): Promise<T> {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const { data, error } = await supabase.functions.invoke<T>(name, {
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });

  if (error) throw new Error(await functionErrorMessage(error));
  return data as T;
}
