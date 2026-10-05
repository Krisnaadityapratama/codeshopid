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
  | "product_documentation"
  | "ipos";
export type RequestStatus =
  | "pending"
  | "in_progress"
  | "rejected"
  | "completed"
  | "cancelled";
export type TeamRequest = {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  rejectionReason: string | null;
  createdBy: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  processedBy: string | null;
};
export type UserRole = "owner" | "admin" | "sales";
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

type RequestRow = {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  rejection_reason: string | null;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  processed_by: string | null;
};

function mapRequest(row: RequestRow): TeamRequest {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    rejectionReason: row.rejection_reason,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    processedBy: row.processed_by,
  };
}

export async function loadRequests(): Promise<TeamRequest[]> {
  const { data, error } = await getClient()
    .from("requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as RequestRow[]).map(mapRequest);
}

export async function createRequest(
  title: string,
  description: string,
  createdBy: string,
  createdByName: string,
): Promise<TeamRequest> {
  const { data, error } = await getClient()
    .from("requests")
    .insert({
      title,
      description,
      created_by: createdBy,
      created_by_name: createdByName,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapRequest(data as RequestRow);
}

export async function setRequestStatus(
  id: string,
  status: RequestStatus,
  processedBy: string,
  rejectionReason: string | null = null,
) {
  const { error } = await getClient()
    .from("requests")
    .update({
      status,
      processed_by: processedBy,
      rejection_reason: status === "rejected" ? rejectionReason : null,
    })
    .eq("id", id);
  if (error) throw error;
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
  action: "create" | "update" | "delete",
  payload: Record<string, unknown>,
) {
  const { data, error } = await getClient().functions.invoke("manage-user", {
    body: { action, ...payload },
  });
  if (error) throw error;
  return data;
}
