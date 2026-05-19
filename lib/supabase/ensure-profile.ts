import type { SupabaseClient, User } from "@supabase/supabase-js";

export type ProfileRow = {
  full_name: string | null;
  timezone: string | null;
  telegram_chat_id: string | null;
};

/**
 * Loads the user's profile, inserting a minimal row if missing (requires
 * `profiles_insert_own` RLS policy — see migration 003).
 */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<{ profile: ProfileRow; error: null } | { profile: null; error: string }> {
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("full_name, timezone, telegram_chat_id")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    return { profile: null, error: selectError.message };
  }

  if (existing) {
    return { profile: existing as ProfileRow, error: null };
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fullName =
    typeof meta?.full_name === "string" && meta.full_name.trim()
      ? meta.full_name.trim()
      : (user.email?.split("@")[0] ?? null);
  const timezone =
    typeof meta?.timezone === "string" && meta.timezone.trim()
      ? meta.timezone.trim()
      : "UTC";

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    full_name: fullName,
    timezone,
  });

  if (insertError && insertError.code !== "23505") {
    return { profile: null, error: insertError.message };
  }

  const { data: created, error: refetchError } = await supabase
    .from("profiles")
    .select("full_name, timezone, telegram_chat_id")
    .eq("id", user.id)
    .single();

  if (refetchError || !created) {
    return {
      profile: null,
      error: refetchError?.message ?? "Profile not found after create",
    };
  }

  return { profile: created as ProfileRow, error: null };
}
