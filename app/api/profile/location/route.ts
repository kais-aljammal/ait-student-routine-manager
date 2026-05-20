import { serverErrorResponse } from "@/lib/api/safe-error";
import { createClient } from "@/lib/supabase/server";
import {
  isValidIanaTimeZone,
  type TimezoneSource,
} from "@/lib/location/timezone";
import { NextResponse } from "next/server";

type LocationBody = {
  timezone?: string;
  timezone_source?: TimezoneSource;
  locale?: string | null;
  city?: string | null;
  country_code?: string | null;
};

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: LocationBody;
  try {
    body = (await request.json()) as LocationBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Record<string, string | null> = {};

  if (body.timezone !== undefined) {
    const tz = body.timezone.trim();
    if (!isValidIanaTimeZone(tz)) {
      return NextResponse.json(
        { error: "timezone must be a valid IANA name" },
        { status: 400 },
      );
    }
    patch.timezone = tz;
  }

  if (body.timezone_source !== undefined) {
    const allowed = ["manual", "browser", "geolocation", "ip", "signup", null];
    if (!allowed.includes(body.timezone_source)) {
      return NextResponse.json(
        { error: "Invalid timezone_source" },
        { status: 400 },
      );
    }
    patch.timezone_source = body.timezone_source;
  }

  if (body.locale !== undefined) {
    patch.locale =
      typeof body.locale === "string" && body.locale.trim()
        ? body.locale.trim().slice(0, 32)
        : null;
  }

  if (body.city !== undefined) {
    patch.city =
      typeof body.city === "string" && body.city.trim()
        ? body.city.trim().slice(0, 120)
        : null;
  }

  if (body.country_code !== undefined) {
    const cc =
      typeof body.country_code === "string"
        ? body.country_code.trim().toUpperCase()
        : "";
    patch.country_code = /^[A-Z]{2}$/.test(cc) ? cc : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .select(
      "timezone, timezone_source, locale, city, country_code, telegram_chat_id",
    )
    .single();

  if (error) {
    return serverErrorResponse("profile/location", "UPDATE_FAILED", error, {
      userId: user.id,
    });
  }

  return NextResponse.json({ profile: data });
}
