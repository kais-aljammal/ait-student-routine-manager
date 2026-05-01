const fs = require("node:fs");
const { chromium } = require("playwright");

function pickEnv(content, key) {
  const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim() : "";
}

async function main() {
  const env = fs.readFileSync(".env.local", "utf8");
  const supabaseUrl = pickEnv(env, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = pickEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  const baseUrl = "http://localhost:3001";

  if (!supabaseUrl || !serviceRole) {
    throw new Error("Missing Supabase URL or service role key in .env.local");
  }

  const email = `e2e_${Date.now()}@example.com`;
  const password = "TestPass123!";

  const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: "E2E User",
        timezone: "Europe/Istanbul",
      },
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Admin create user failed: ${createRes.status} ${errorText}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[name=email]", { timeout: 20_000 });
    await page.click("input[name=email]");
    await page.keyboard.type(email);
    await page.click("input[name=password]");
    await page.keyboard.type(password);
    const emailValue = await page.inputValue("input[name=email]");
    const passwordValue = await page.inputValue("input[name=password]");
    if (!emailValue || !passwordValue) {
      throw new Error("Login inputs were not populated before submit");
    }
    await page.click('button:has-text("Sign in")');
    try {
      await page.waitForURL(/\/dashboard(\/constraints)?/, { timeout: 45_000 });
    } catch {
      const alert = await page.locator('[role="alert"]').first().textContent();
      throw new Error(`Login did not redirect. UI error: ${alert ?? "none"}`);
    }

    const generateRes = await page.request.post(
      `${baseUrl}/api/generate-schedule`,
      {
        data: {
          day_plan: {
            classes: [{ title: "Math Class", start: "10:00", end: "11:30" }],
            activities: [],
            meals: {
              breakfast: { enabled: false, start: "08:00", end: "08:10" },
              lunch: { enabled: false, start: "13:00", end: "13:30" },
              dinner: { enabled: false, start: "19:00", end: "19:30" },
            },
            travel: {
              home_to_uni: 30,
              uni_to_home: 30,
              home_to_gym: 20,
              gym_to_home: 20,
              uni_to_gym: 20,
              gym_to_uni: 20,
              home_to_store: 15,
              store_to_home: 15,
              uni_to_store: 15,
              store_to_uni: 15,
              gym_to_store: 15,
              store_to_gym: 15,
            },
            multi_campus: false,
            campuses: [],
            campus_transfer_minutes: 15,
            wake_window: { start: "07:00", end: "08:00" },
            sleep_window: { start: "22:00", end: "23:30" },
            transition_buffers: {
              morning_prep_minutes: 20,
              post_class_minutes: 10,
              meal_reset_minutes: 10,
            },
          },
        },
      },
    );

    if (!generateRes.ok()) {
      const body = await generateRes.text();
      throw new Error(`Generate schedule failed: ${generateRes.status()} ${body}`);
    }
    const generateBody = await generateRes.json();
    const scheduleDate = generateBody.schedule_date;
    if (!scheduleDate) {
      throw new Error("Generate schedule response missing schedule_date");
    }

    await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });

    const tasksRes = await page.request.get(
      `${baseUrl}/api/tasks?schedule_date=${scheduleDate}`,
    );
    if (!tasksRes.ok()) {
      throw new Error(`Authenticated /api/tasks failed: ${tasksRes.status()}`);
    }

    const tasksPayload = await tasksRes.json();
    const tasks = tasksPayload?.tasks;
    if (!Array.isArray(tasks) || tasks.length === 0) {
      throw new Error("No tasks returned after Save & Generate");
    }

    console.log(`E2E_PASS tasks=${tasks.length} user=${email}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("E2E_FAIL", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
