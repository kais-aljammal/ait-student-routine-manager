import { logRouteError, serverErrorResponse } from "@/lib/api/safe-error";
import { createClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/supabase/ensure-profile";
import { getTodayDateStringInTimeZone } from "@/lib/date";
import { isValidCalendarDate } from "@/lib/utils/date";
import {
  extractJsonArrayFromModelText,
  parseAndValidateGeneratedTasks,
  sanitizeGeneratedTasks,
} from "@/lib/schedule/generated-task";
import { buildScheduleGenerationPrompt } from "@/lib/schedule/prompt";
import { generateTasksFromDayPlan, type DayPlanInput } from "@/lib/routine/day-plan";
import { generateWithClaude } from "@/lib/claude";
import { withTimeout } from "@/lib/utils";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { NextResponse } from "next/server";

type ProviderResult = {
  provider: "claude" | "gemini" | "openrouter" | "groq";
  text: string;
};

const JSON_ONLY_SYSTEM_MESSAGE =
  "Return only a raw JSON array with no markdown, no backticks, and no extra text.";

function countAutoFilledTitles(before: unknown, after: unknown): number {
  if (!Array.isArray(before) || !Array.isArray(after)) return 0;
  let count = 0;
  const len = Math.min(before.length, after.length);
  for (let i = 0; i < len; i += 1) {
    const b = before[i];
    const a = after[i];
    if (!b || typeof b !== "object" || !a || typeof a !== "object") continue;
    const rawTitle = (b as { title?: unknown }).title;
    const fixedTitle = (a as { title?: unknown }).title;
    const rawEmpty = typeof rawTitle !== "string" || rawTitle.trim().length === 0;
    const fixedNonEmpty = typeof fixedTitle === "string" && fixedTitle.trim().length > 0;
    if (rawEmpty && fixedNonEmpty) count += 1;
  }
  return count;
}

function getTimeoutMs(provider: ProviderResult["provider"]): number {
  const override = Number(process.env.LLM_PROVIDER_TIMEOUT_MS);
  if (Number.isFinite(override) && override > 0) {
    return override;
  }
  if (provider === "claude") return 25_000;
  if (provider === "gemini") return 25_000;
  if (provider === "openrouter") return 20_000;
  return 20_000;
}

function isValidScheduleCoverage(tasks: ReturnType<typeof parseAndValidateGeneratedTasks>) {
  if (tasks.length < 5) return false;
  const firstStart = new Date(tasks[0].starts_at);
  const lastEnd = new Date(tasks[tasks.length - 1].ends_at);
  const firstMinutes = firstStart.getUTCHours() * 60 + firstStart.getUTCMinutes();
  const lastMinutes = lastEnd.getUTCHours() * 60 + lastEnd.getUTCMinutes();
  if (firstMinutes > 60 || lastMinutes < 22 * 60) return false;

  for (let i = 0; i < tasks.length; i += 1) {
    const start = Date.parse(tasks[i].starts_at);
    const end = Date.parse(tasks[i].ends_at);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false;
    if (i > 0) {
      const prevEnd = Date.parse(tasks[i - 1].ends_at);
      if (start < prevEnd) return false;
    }
  }
  return true;
}

async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }
  const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function generateWithOpenRouter(prompt: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }
  const preferred = process.env.OPENROUTER_MODEL?.trim();
  const models = [
    preferred || "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
  ];
  const errors: string[] = [];

  for (const model of models) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: JSON_ONLY_SYSTEM_MESSAGE,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0,
        max_tokens: 4096,
      }),
    });
    const raw = (await res.json()) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };
    if (!res.ok) {
      errors.push(`${model}: ${raw.error?.message ?? `HTTP ${res.status}`}`);
      continue;
    }
    const text = raw.choices?.[0]?.message?.content;
    if (!text) {
      errors.push(`${model}: empty text`);
      continue;
    }
    return text;
  }

  throw new Error(`OpenRouter failed models: ${errors.join(" ; ")}`);
}

async function generateWithGroq(prompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    throw new Error("GROQ_API_KEY is missing");
  }
  const client = new Groq({ apiKey: key });
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: JSON_ONLY_SYSTEM_MESSAGE,
      },
      { role: "user", content: prompt },
    ],
  });
  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error("Groq returned empty text");
  }
  return text;
}

async function repairJsonWithProvider(
  provider: ProviderResult["provider"],
  badText: string,
): Promise<string> {
  const repairPrompt = `You are a JSON repair tool.
Fix the content below into a valid JSON array only.
Rules:
- Output ONLY valid JSON array.
- Keep the same task objects/values as much as possible.
- Remove markdown fences/explanations.

BROKEN_CONTENT:
${badText}`;

  if (provider === "gemini") {
    return generateWithGemini(repairPrompt);
  }
  if (provider === "claude") {
    return generateWithClaude(repairPrompt);
  }
  if (provider === "openrouter") {
    return generateWithOpenRouter(repairPrompt);
  }
  return generateWithGroq(repairPrompt);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { schedule_date?: string; day_plan?: DayPlanInput } = {};
    try {
      body = (await request.json()) as { schedule_date?: string };
    } catch {
      body = {};
    }

    const ensured = await ensureUserProfile(supabase, user);
    if (!ensured.profile) {
      console.error(
        JSON.stringify({
          route: "generate-schedule",
          errorCode: "PROFILE_ENSURE_FAILED",
          userId: user.id,
          message: ensured.error,
        }),
      );
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 400 },
      );
    }

    const timeZone = ensured.profile.timezone || "UTC";
    const rawSchedule = body.schedule_date;
    let scheduleDate: string;
    if (rawSchedule === undefined) {
      scheduleDate = getTodayDateStringInTimeZone(timeZone);
    } else if (
      typeof rawSchedule === "string" &&
      isValidCalendarDate(rawSchedule.trim())
    ) {
      scheduleDate = rawSchedule.trim();
    } else {
      return NextResponse.json(
        { error: "schedule_date must be YYYY-MM-DD when provided" },
        { status: 400 },
      );
    }

    const dailyLimitRaw = process.env.FREE_DAILY_GENERATION_LIMIT ?? "20";
    const dailyLimit = Number(dailyLimitRaw);
    if (!Number.isFinite(dailyLimit) || dailyLimit < 1) {
      return NextResponse.json(
        { error: "FREE_DAILY_GENERATION_LIMIT must be a positive number." },
        { status: 500 },
      );
    }

    const { data: usageRow, error: usageFetchError } = await supabase
      .from("ai_usage_limits")
      .select("requests_count")
      .eq("user_id", user.id)
      .eq("usage_date", scheduleDate)
      .maybeSingle();

    const isUsageTableMissing =
      usageFetchError &&
      ((usageFetchError as { code?: string }).code === "42P01" ||
        usageFetchError.message.toLowerCase().includes("ai_usage_limits"));
    const usageLimitEnabled = !isUsageTableMissing;

    if (usageFetchError && usageLimitEnabled) {
      return serverErrorResponse("generate-schedule", "USAGE_FETCH_FAILED", usageFetchError);
    }

    const usedToday = usageRow?.requests_count ?? 0;
    if (usageLimitEnabled && usedToday >= dailyLimit) {
      return NextResponse.json(
        {
          error: `Daily free-tier generation limit reached (${usedToday}/${dailyLimit}). It will reset tomorrow.`,
        },
        { status: 429 },
      );
    }

    let tasks: ReturnType<typeof parseAndValidateGeneratedTasks> | null = null;
    let autoFilledTitleRepairs = 0;

    if (body.day_plan) {
      try {
        tasks = generateTasksFromDayPlan(scheduleDate, body.day_plan);
      } catch (e) {
        return NextResponse.json(
          {
            error:
              e instanceof Error
                ? e.message
                : "Invalid day plan input. Please adjust your times.",
          },
          { status: 400 },
        );
      }
    } else {
      const { data: constraintsRow, error: constraintsError } = await supabase
        .from("constraints")
        .select("life_variables")
        .eq("user_id", user.id)
        .single();

      if (constraintsError || !constraintsRow) {
        return NextResponse.json(
          {
            error: "Please complete your daily setup before generating a schedule.",
          },
          { status: 400 },
        );
      }

      const life = constraintsRow.life_variables as any;

      if (!life || !life.wake_up_time || !Array.isArray(life.activities) || life.activities.length === 0) {
        return NextResponse.json(
          { error: "Please complete your daily setup before generating a schedule." },
          { status: 400 }
        );
      }

      const prompt = buildScheduleGenerationPrompt(life, timeZone, scheduleDate);

      const providerErrors: string[] = [];

      const providers: Array<{
        name: ProviderResult["provider"];
        run: () => Promise<ProviderResult>;
      }> = [
          {
            name: "claude",
            run: async () => ({ provider: "claude", text: await generateWithClaude(prompt) }),
          },
          {
            name: "gemini",
            run: async () => ({ provider: "gemini", text: await generateWithGemini(prompt) }),
          },
          {
            name: "openrouter",
            run: async () => ({ provider: "openrouter", text: await generateWithOpenRouter(prompt) }),
          },
          {
            name: "groq",
            run: async () => ({ provider: "groq", text: await generateWithGroq(prompt) }),
          },
        ];

      for (const provider of providers) {
        try {
          const startedAt = Date.now();
          const result = await withTimeout(
            provider.run(),
            getTimeoutMs(provider.name),
            provider.name,
          );
          try {
            const parsed = extractJsonArrayFromModelText(result.text);
            const sanitized = sanitizeGeneratedTasks(parsed, scheduleDate);
            autoFilledTitleRepairs += countAutoFilledTitles(parsed, sanitized);
            const validated = parseAndValidateGeneratedTasks(
              sanitized,
              scheduleDate,
              timeZone,
            );
            tasks = validated;
          } catch {
            const repairedText = await repairJsonWithProvider(
              provider.name,
              result.text,
            );
            const repairedParsed = extractJsonArrayFromModelText(repairedText);
            const repairedSanitized = sanitizeGeneratedTasks(repairedParsed, scheduleDate);
            autoFilledTitleRepairs += countAutoFilledTitles(
              repairedParsed,
              repairedSanitized,
            );
            const validated = parseAndValidateGeneratedTasks(
              repairedSanitized,
              scheduleDate,
              timeZone,
            );
            tasks = validated;
            providerErrors.push(
              `${provider.name}: initial JSON invalid, repaired successfully`,
            );
          }
          console.log(
            `Provider success: ${provider.name} in ${Date.now() - startedAt}ms`,
          );
          break;
        } catch (e) {
          const message = e instanceof Error ? e.message : "Unknown provider error";
          providerErrors.push(`${provider.name}: ${message}`);
        }
      }

      if (!tasks) {
        logRouteError("generate-schedule", "ALL_PROVIDERS_FAILED", providerErrors.join("; "));
        return NextResponse.json(
          {
            error:
              "All AI providers are currently unavailable. Please try again in a few minutes.",
          },
          { status: 400 },
        );
      }


    }

    const { error: delError } = await supabase
      .from("tasks")
      .delete()
      .eq("user_id", user.id)
      .eq("schedule_date", scheduleDate);

    if (delError) {
      return serverErrorResponse("generate-schedule", "DELETE_TASKS_FAILED", delError);
    }

    const insertRows = tasks.map((t) => ({
      user_id: user.id,
      title: t.title,
      category: t.category,
      starts_at: t.starts_at,
      ends_at: t.ends_at,
      schedule_date: t.schedule_date,
      completed: false,
      alert_sent_at: null as string | null,
    }));

    const { error: insError } = await supabase.from("tasks").insert(insertRows);

    if (insError) {
      return serverErrorResponse("generate-schedule", "INSERT_TASKS_FAILED", insError);
    }

    if (usageLimitEnabled) {
      const { error: usageUpsertError } = await supabase
        .from("ai_usage_limits")
        .upsert(
          {
            user_id: user.id,
            usage_date: scheduleDate,
            requests_count: usedToday + 1,
          },
          { onConflict: "user_id,usage_date" },
        );
      if (usageUpsertError) {
        return serverErrorResponse("generate-schedule", "USAGE_UPSERT_FAILED", usageUpsertError);
      }
    }

    return NextResponse.json({
      ok: true,
      schedule_date: scheduleDate,
      count: insertRows.length,
      auto_filled_title_repairs: autoFilledTitleRepairs,
    });
  } catch (e) {
    return serverErrorResponse("generate-schedule", "UNHANDLED", e);
  }
}
