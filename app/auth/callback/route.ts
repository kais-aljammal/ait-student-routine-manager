import { safeRedirectPath } from "@/lib/api/safe-error";
import { ensureUserProfile } from "@/lib/supabase/ensure-profile";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type AuthCookie = { name: string; value: string; options: CookieOptions };

function isLikelyIanaTimeZone(value: string | null): value is string {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));
  const tzParam = searchParams.get("tz");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: AuthCookie[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const metadataTz =
        typeof user?.user_metadata?.timezone === "string"
          ? user.user_metadata.timezone
          : null;
      const chosenTz = isLikelyIanaTimeZone(tzParam)
        ? tzParam
        : isLikelyIanaTimeZone(metadataTz)
          ? metadataTz
          : null;
      if (user) {
        const ensured = await ensureUserProfile(supabase, user);
        if (chosenTz && ensured.profile) {
          await supabase
            .from("profiles")
            .update({ timezone: chosenTz, timezone_source: "signup" })
            .eq("id", user.id);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
