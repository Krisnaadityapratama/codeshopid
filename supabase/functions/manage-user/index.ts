import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return jsonResponse({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey)
    return jsonResponse(
      { error: "Supabase function secrets are not configured." },
      500,
    );

  const authorization = request.headers.get("Authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (!token)
    return jsonResponse({ error: "Authentication is required." }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } =
    await adminClient.auth.getUser(token);
  if (authError || !authData.user)
    return jsonResponse({ error: "Invalid session." }, 401);

  const { data: callerProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();
  if (profileError || callerProfile.role !== "owner")
    return jsonResponse({ error: "Admin Utama access is required." }, 403);

  let body: {
    action?: string;
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    userId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON request body." }, 400);
  }

  if (body.action === "create") {
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const role = body.role;
    if (
      !name ||
      !email ||
      password.length < 8 ||
      (role !== "admin" && role !== "sales")
    ) {
      return jsonResponse(
        {
          error:
            "Name, valid email, password of at least 8 characters, and valid role are required.",
        },
        400,
      );
    }

    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });
    if (createError || !created.user)
      return jsonResponse(
        { error: createError?.message ?? "User could not be created." },
        400,
      );

    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ name, email, role })
      .eq("id", created.user.id);
    if (updateError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return jsonResponse({ error: "User profile could not be created." }, 500);
    }
    return jsonResponse({ userId: created.user.id });
  }

  if (body.action === "update") {
    const userId = body.userId;
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const role = body.role;
    if (!userId || !name || !email || (role !== "admin" && role !== "sales"))
      return jsonResponse(
        { error: "User ID, name, valid email, and valid role are required." },
        400,
      );
    if (userId === authData.user.id)
      return jsonResponse(
        { error: "You cannot edit your own account here." },
        400,
      );

    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .single();
    if (targetError) return jsonResponse({ error: "User was not found." }, 404);
    if (targetProfile.role === "owner")
      return jsonResponse(
        { error: "The Admin Utama account cannot be edited here." },
        400,
      );

    const { data: existingProfile, error: emailCheckError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .neq("id", userId)
      .maybeSingle();
    if (emailCheckError)
      return jsonResponse(
        { error: "Email availability could not be checked." },
        500,
      );
    if (existingProfile)
      return jsonResponse(
        { error: "Email is already used by another account." },
        409,
      );

    const { data: targetAuth, error: authLookupError } =
      await adminClient.auth.admin.getUserById(userId);
    if (authLookupError || !targetAuth.user)
      return jsonResponse({ error: "Auth user was not found." }, 404);

    const previousAuthUser = targetAuth.user;
    const { error: authUpdateError } =
      await adminClient.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
        user_metadata: {
          ...previousAuthUser.user_metadata,
          full_name: name,
        },
      });
    if (authUpdateError)
      return jsonResponse({ error: authUpdateError.message }, 400);

    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({ name, email, role })
      .eq("id", userId);
    if (profileUpdateError) {
      const { error: rollbackError } =
        await adminClient.auth.admin.updateUserById(userId, {
          email: previousAuthUser.email,
          email_confirm: true,
          user_metadata: previousAuthUser.user_metadata,
        });
      return jsonResponse(
        {
          error: rollbackError
            ? "Profile update failed and Auth rollback failed. Contact support."
            : "Profile update failed; Auth changes were rolled back.",
        },
        500,
      );
    }

    return jsonResponse({ userId });
  }

  if (body.action === "delete") {
    const userId = body.userId;
    if (!userId) return jsonResponse({ error: "User ID is required." }, 400);
    if (userId === authData.user.id)
      return jsonResponse(
        { error: "You cannot delete your own account." },
        400,
      );

    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (targetError) return jsonResponse({ error: "User was not found." }, 404);

    if (targetProfile.role === "owner")
      return jsonResponse(
        { error: "The Admin Utama account cannot be deleted here." },
        400,
      );

    const { error: deleteError } =
      await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) return jsonResponse({ error: deleteError.message }, 400);
    return jsonResponse({ userId });
  }

  return jsonResponse({ error: "Unsupported action." }, 400);
});
