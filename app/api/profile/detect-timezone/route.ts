import { createClient } from "@/lib/supabase/server";
import { isValidIanaTimeZone } from "@/lib/location/timezone";
import { NextResponse } from "next/server";

type TimeApiCoordinate = { timeZone?: string };
type TimeApiIp = { timeZone?: string; city?: string; countryCode?: string };

async function fetchTimezoneFromCoordinates(
  lat: number,
  lon: number,
): Promise<{ timeZone: string | null; city: string | null; countryCode: string | null }> {
  const url = `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    return { timeZone: null, city: null, countryCode: null };
  }
  const data = (await res.json()) as TimeApiCoordinate;
  const timeZone = isValidIanaTimeZone(data.timeZone ?? null) ? data.timeZone! : null;
  return { timeZone, city: null, countryCode: null };
}

async function fetchTimezoneFromIp(
  ip: string | null,
): Promise<{ timeZone: string | null; city: string | null; countryCode: string | null }> {
  const url = ip
    ? `https://timeapi.io/api/ip?ipAddress=${encodeURIComponent(ip)}`
    : "https://timeapi.io/api/ip";
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    return { timeZone: null, city: null, countryCode: null };
  }
  const data = (await res.json()) as TimeApiIp;
  const timeZone = isValidIanaTimeZone(data.timeZone ?? null) ? data.timeZone! : null;
  return {
    timeZone,
    city: data.city?.trim() || null,
    countryCode: data.countryCode?.trim()?.toUpperCase() || null,
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const latRaw = searchParams.get("lat");
  const lonRaw = searchParams.get("lon");

  let detected: {
    timeZone: string | null;
    city: string | null;
    countryCode: string | null;
  };
  let source: "geolocation" | "ip";

  if (latRaw && lonRaw) {
    const lat = Number(latRaw);
    const lon = Number(lonRaw);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }
    detected = await fetchTimezoneFromCoordinates(lat, lon);
    source = "geolocation";
  } else {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || null;
    detected = await fetchTimezoneFromIp(ip);
    source = "ip";
  }

  if (!detected.timeZone) {
    return NextResponse.json(
      { error: "Could not detect timezone. Try browser detection in Settings." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    timezone: detected.timeZone,
    timezone_source: source,
    city: detected.city,
    country_code: detected.countryCode,
    approximate: source === "ip",
  });
}
