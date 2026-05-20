// Returns the authenticated user's saved constraints (life_variables).
import { serverErrorResponse } from "@/lib/api/safe-error";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("constraints")
    .select("life_variables")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return serverErrorResponse("constraints", "FETCH_FAILED", error);
  }

  return NextResponse.json({
    ok: true,
    life_variables: data?.life_variables ?? null,
  });
}
