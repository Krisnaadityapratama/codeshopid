import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase =
  supabaseConfigured && supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export type ContentCollection =
  | "products"
  | "troubleshooting"
  | "software"
  | "apps"
  | "tutorials"
  | "playlists"
  | "ipos";
export type UserRole = "admin" | "sales";
export type AppProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
};

function getClient() {
  if (!supabase)
    throw new Error(
      "Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env.local.",
    );
  return supabase;
}

export async function loadContent<T>(
  collection: ContentCollection,
): Promise<T[]> {
  const { data, error } = await getClient()
    .from("app_content")
    .select("record_id, payload")
    .eq("collection", collection)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => row.payload as T);
}

export async function saveContent(
  collection: ContentCollection,
  recordId: string,
  payload: unknown,
) {
  const { error } = await getClient()
    .from("app_content")
    .upsert(
      { collection, record_id: recordId, payload },
      { onConflict: "collection,record_id" },
    );
  if (error) throw error;
}

export async function deleteContent(
  collection: ContentCollection,
  recordId: string,
) {
  const { error } = await getClient()
    .from("app_content")
    .delete()
    .eq("collection", collection)
    .eq("record_id", recordId);
  if (error) throw error;
}

export async function loadProfile(userId: string): Promise<AppProfile> {
  const { data, error } = await getClient()
    .from("profiles")
    .select("id, name, email, role, created_at")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data as AppProfile;
}

export async function loadProfiles(): Promise<AppProfile[]> {
  const { data, error } = await getClient()
    .from("profiles")
    .select("id, name, email, role, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AppProfile[];
}

export async function manageUser(
  action: "create" | "delete",
  payload: Record<string, unknown>,
) {
  const { data, error } = await getClient().functions.invoke("manage-user", {
    body: { action, ...payload },
  });
  if (error) throw error;
  return data;
}
