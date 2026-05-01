import type { GeneratedTaskInput } from "@/lib/schedule/generated-task";

type Category = "class" | "study" | "life";
type Location = "home" | "uni" | "gym" | "store" | `campus:${string}`;

export type DayPlanClassInput = {
  title: string;
  start: string; // HH:MM
  end: string; // HH:MM
  campus?: string;
};

export type DayPlanActivityInput = {
  title: string;
  start: string; // HH:MM
  end: string; // HH:MM
  location: "home" | "uni" | "gym" | "store";
};

export type DayPlanMealInput = {
  enabled: boolean;
  start: string;
  end: string;
};

export type DayPlanInput = {
  classes: DayPlanClassInput[];
  activities: DayPlanActivityInput[];
  meals: {
    breakfast: DayPlanMealInput;
    lunch: DayPlanMealInput;
    dinner: DayPlanMealInput;
  };
  travel: {
    home_to_uni: number;
    uni_to_home: number;
    home_to_gym: number;
    gym_to_home: number;
    uni_to_gym: number;
    gym_to_uni: number;
    home_to_store: number;
    store_to_home: number;
    uni_to_store: number;
    store_to_uni: number;
    gym_to_store: number;
    store_to_gym: number;
  };
  multi_campus: boolean;
  campuses: Array<{
    name: string;
    home_to_campus: number;
    campus_to_home: number;
    campus_to_gym: number;
    gym_to_campus: number;
  }>;
  campus_transfer_minutes: number;
  wake_window: {
    start: string; // HH:MM
    end: string; // HH:MM
  };
  sleep_window: {
    start: string; // HH:MM
    end: string; // HH:MM
  };
  transition_buffers?: {
    morning_prep_minutes?: number;
    post_class_minutes?: number;
    post_gym_minutes?: number;
    post_hangout_minutes?: number;
    meal_reset_minutes?: number;
  };
};

type Block = {
  title: string;
  category: Category;
  location: Location;
  startMin: number;
  endMin: number;
};

const DAY_MINUTES = 24 * 60;

function toNonNegativeInt(value: number | undefined, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
}

function parseHHMM(value: string): number {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    throw new Error(`Time must be HH:MM, got "${value}"`);
  }
  const [hRaw, mRaw] = value.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (h < 0 || h > 23 || m < 0 || m > 59) {
    throw new Error(`Invalid time "${value}"`);
  }
  return h * 60 + m;
}

function minToHHMM(min: number): string {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function toIsoUtc(scheduleDate: string, min: number): string {
  return `${scheduleDate}T${minToHHMM(min)}:00.000Z`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function chooseWindowTime(
  startMin: number,
  endMin: number,
  preferred: number,
): number {
  if (endMin <= startMin) {
    throw new Error("Wake/sleep window end must be after start");
  }
  return clamp(preferred, startMin, endMin);
}

function assertNoOverlaps(blocks: Block[]): void {
  for (let i = 0; i < blocks.length - 1; i++) {
    if (blocks[i]!.endMin > blocks[i + 1]!.startMin) {
      throw new Error(
        `Time overlap: "${blocks[i]!.title}" conflicts with "${blocks[i + 1]!.title}"`,
      );
    }
  }
}

function commuteMinutes(
  from: Location,
  to: Location,
  plan: DayPlanInput,
): number {
  if (from === to) return 0;
  const tr = plan.travel;
  const campusByName = new Map(
    plan.campuses.map((c) => [c.name.trim().toLowerCase(), c]),
  );
  const uniCampus =
    plan.multi_campus && plan.campuses.length > 0
      ? `campus:${plan.campuses[0]!.name.trim().toLowerCase()}`
      : "uni";

  const norm = (loc: Location): Location =>
    loc === "uni" && plan.multi_campus ? (uniCampus as Location) : loc;

  const a = norm(from);
  const b = norm(to);
  if (a === b) return 0;

  const aCampus = a.startsWith("campus:") ? a.slice(7) : null;
  const bCampus = b.startsWith("campus:") ? b.slice(7) : null;
  if (aCampus && bCampus) {
    return toNonNegativeInt(plan.campus_transfer_minutes, 15);
  }

  if (a === "home" && b === "uni") return toNonNegativeInt(tr.home_to_uni, 30);
  if (a === "uni" && b === "home") return toNonNegativeInt(tr.uni_to_home, 30);
  if (a === "home" && b === "gym") return toNonNegativeInt(tr.home_to_gym, 20);
  if (a === "gym" && b === "home") return toNonNegativeInt(tr.gym_to_home, 20);
  if (a === "uni" && b === "gym") return toNonNegativeInt(tr.uni_to_gym, 20);
  if (a === "gym" && b === "uni") return toNonNegativeInt(tr.gym_to_uni, 20);
  if (a === "home" && b === "store") return toNonNegativeInt(tr.home_to_store, 15);
  if (a === "store" && b === "home") return toNonNegativeInt(tr.store_to_home, 15);
  if (a === "uni" && b === "store") return toNonNegativeInt(tr.uni_to_store, 15);
  if (a === "store" && b === "uni") return toNonNegativeInt(tr.store_to_uni, 15);
  if (a === "gym" && b === "store") return toNonNegativeInt(tr.gym_to_store, 15);
  if (a === "store" && b === "gym") return toNonNegativeInt(tr.store_to_gym, 15);

  if (aCampus) {
    const c = campusByName.get(aCampus);
    if (!c) return toNonNegativeInt(plan.campus_transfer_minutes, 15);
    if (b === "home") return toNonNegativeInt(c.campus_to_home, 30);
    if (b === "gym") return toNonNegativeInt(c.campus_to_gym, 20);
  }
  if (bCampus) {
    const c = campusByName.get(bCampus);
    if (!c) return toNonNegativeInt(plan.campus_transfer_minutes, 15);
    if (a === "home") return toNonNegativeInt(c.home_to_campus, 30);
    if (a === "gym") return toNonNegativeInt(c.gym_to_campus, 20);
  }

  return toNonNegativeInt(plan.campus_transfer_minutes, 15);
}

function hasWord(title: string, word: string): boolean {
  return title.toLowerCase().includes(word);
}

function isCommuteBlock(block: Block | undefined): boolean {
  return Boolean(block && block.title.toLowerCase().startsWith("commute ("));
}

function minimumBufferMinutes(prev: Block | undefined, plan: DayPlanInput): number {
  const cfg = plan.transition_buffers;
  if (!prev) return toNonNegativeInt(cfg?.morning_prep_minutes, 30);
  if (hasWord(prev.title, "gym")) return toNonNegativeInt(cfg?.post_gym_minutes, 20);
  if (hasWord(prev.title, "hangout")) return toNonNegativeInt(cfg?.post_hangout_minutes, 20);
  if (prev.category === "class") return toNonNegativeInt(cfg?.post_class_minutes, 15);
  if (
    hasWord(prev.title, "breakfast") ||
    hasWord(prev.title, "lunch") ||
    hasWord(prev.title, "dinner")
  ) {
    return toNonNegativeInt(cfg?.meal_reset_minutes, 10);
  }
  return 0;
}

function pickGapLabel(prev?: Block, next?: Block): string {
  if (!prev) return "wake up + hygiene";
  if (hasWord(prev.title, "gym")) return "shower + recovery";
  if (hasWord(prev.title, "hangout")) return "travel back + wind down";
  if (prev.category === "class") return "post-class transition";
  if (hasWord(prev.title, "breakfast") || hasWord(prev.title, "lunch") || hasWord(prev.title, "dinner")) {
    return "clean up + reset";
  }
  if (!next) return "evening wind-down";
  if (next.category === "class") return "get ready for class";
  if (hasWord(next.title, "breakfast") || hasWord(next.title, "lunch") || hasWord(next.title, "dinner")) {
    return "meal prep / break";
  }
  return "personal buffer";
}

function gapBlocksAwake(startMin: number, endMin: number, prev?: Block, next?: Block): Block[] {
  const out: Block[] = [];
  if (endMin <= startMin) return out;
  const label = pickGapLabel(prev, next);
  const gap = endMin - startMin;
  if (gap <= 90) {
    out.push({
      title: label,
      category: "life",
      location: prev?.location ?? "home",
      startMin,
      endMin,
    });
    return out;
  }

  const firstLen = Math.min(60, gap);
  out.push({
    title: label,
    category: "life",
    location: prev?.location ?? "home",
    startMin,
    endMin: startMin + firstLen,
  });
  out.push({
    title: "personal time",
    category: "life",
    location: prev?.location ?? "home",
    startMin: startMin + firstLen,
    endMin,
  });
  return out;
}

function toBlocks(plan: DayPlanInput): Block[] {
  const blocks: Block[] = [];
  for (const c of plan.classes) {
    if (!c.title.trim()) continue;
    const startMin = parseHHMM(c.start);
    const endMin = parseHHMM(c.end);
    if (endMin <= startMin) {
      throw new Error(`Class "${c.title}" has invalid time range`);
    }
    const campus = c.campus?.trim();
    blocks.push({
      title: c.title.trim(),
      category: "class",
      location: campus ? (`campus:${campus.toLowerCase()}` as Location) : "uni",
      startMin,
      endMin,
    });
  }

  for (const a of plan.activities) {
    if (!a.title.trim()) continue;
    const startMin = parseHHMM(a.start);
    const endMin = parseHHMM(a.end);
    if (endMin <= startMin) {
      throw new Error(`Activity "${a.title}" has invalid time range`);
    }
    blocks.push({
      title: a.title.trim(),
      category: "life",
      location: a.location,
      startMin,
      endMin,
    });
  }

  const meals: Array<[string, DayPlanMealInput]> = [
    ["breakfast", plan.meals.breakfast],
    ["lunch", plan.meals.lunch],
    ["dinner", plan.meals.dinner],
  ];
  for (const [name, meal] of meals) {
    if (!meal.enabled) continue;
    const startMin = parseHHMM(meal.start);
    const endMin = parseHHMM(meal.end);
    if (endMin <= startMin) {
      throw new Error(`${name} has invalid time range`);
    }
    blocks.push({
      title: name,
      category: "life",
      location: "home",
      startMin,
      endMin,
    });
  }

  blocks.sort((a, b) => a.startMin - b.startMin);
  assertNoOverlaps(blocks);
  return blocks;
}

function insertCommuteBlocks(base: Block[], plan: DayPlanInput): Block[] {
  const out: Block[] = [];
  for (let i = 0; i < base.length; i++) {
    const cur = base[i]!;
    out.push(cur);
    const next = base[i + 1];
    if (!next) continue;
    const minutes = commuteMinutes(cur.location, next.location, plan);
    if (minutes <= 0) continue;
    const gap = next.startMin - cur.endMin;
    if (gap < minutes) {
      throw new Error(
        `Not enough travel time between "${cur.title}" and "${next.title}". Need ${minutes} minutes.`,
      );
    }
    const travelStart = next.startMin - minutes;
    if (travelStart < cur.endMin) {
      throw new Error(`Travel overlap between "${cur.title}" and "${next.title}"`);
    }
    out.push({
      title: `commute (${cur.location} -> ${next.location})`,
      category: "life",
      location: next.location,
      startMin: travelStart,
      endMin: next.startMin,
    });
  }
  out.sort((a, b) => a.startMin - b.startMin);
  assertNoOverlaps(out);
  return out;
}

export function generateTasksFromDayPlan(
  scheduleDate: string,
  plan: DayPlanInput,
): GeneratedTaskInput[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduleDate)) {
    throw new Error("schedule_date must be YYYY-MM-DD");
  }

  let blocks = toBlocks(plan);
  blocks = insertCommuteBlocks(blocks, plan);

  const wakeStart = parseHHMM(plan.wake_window.start);
  const wakeEnd = parseHHMM(plan.wake_window.end);
  const sleepStart = parseHHMM(plan.sleep_window.start);
  const sleepEnd = parseHHMM(plan.sleep_window.end);
  if (wakeEnd <= wakeStart) {
    throw new Error("Wake-up range is invalid.");
  }
  if (sleepEnd <= sleepStart) {
    throw new Error("Sleep range is invalid.");
  }

  const firstStart = blocks.length > 0 ? blocks[0]!.startMin : 9 * 60;
  const lastEnd = blocks.length > 0 ? blocks[blocks.length - 1]!.endMin : 18 * 60;
  const wakeMin = chooseWindowTime(wakeStart, wakeEnd, firstStart - 60);
  const sleepMin = chooseWindowTime(sleepStart, sleepEnd, lastEnd + 90);
  if (sleepMin <= wakeMin) {
    throw new Error("Sleep time must be after wake time.");
  }
  const awakeMinutes = sleepMin - wakeMin;
  if (awakeMinutes > 18 * 60) {
    throw new Error(
      "Awake duration is too long based on wake/sleep windows. Please adjust ranges.",
    );
  }
  if (awakeMinutes < 10 * 60) {
    throw new Error(
      "Awake duration is too short based on wake/sleep windows. Please adjust ranges.",
    );
  }
  for (const b of blocks) {
    if (b.startMin < wakeMin || b.endMin > sleepMin) {
      throw new Error(
        `"${b.title}" is outside the allowed awake window. Adjust event times or wake/sleep ranges.`,
      );
    }
  }

  const full: Block[] = [];
  let cursor = wakeMin;
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i]!;
    const prev = i > 0 ? blocks[i - 1] : undefined;
    let prevMeaningful = prev;
    while (isCommuteBlock(prevMeaningful)) {
      if (!prevMeaningful) break;
      const idx = blocks.indexOf(prevMeaningful);
      prevMeaningful = idx > 0 ? blocks[idx - 1] : undefined;
    }
    const next = blocks[i + 1];
    const mandatoryBuffer = minimumBufferMinutes(prevMeaningful, plan);
    const availableGap = b.startMin - cursor;
    if (availableGap < mandatoryBuffer) {
      const prevLabel = prevMeaningful?.title ?? "wake-up";
      throw new Error(
        `Not enough transition time after "${prevLabel}". Need at least ${mandatoryBuffer} minutes before "${b.title}".`,
      );
    }
    full.push(...gapBlocksAwake(cursor, b.startMin, prevMeaningful, b));
    full.push(b);
    cursor = b.endMin;
    if (!next) {
      const endBuffer = minimumBufferMinutes(b, plan);
      if (sleepMin - cursor < endBuffer) {
        throw new Error(
          `Not enough transition time after "${b.title}". Need at least ${endBuffer} minutes before sleep.`,
        );
      }
      full.push(...gapBlocksAwake(cursor, sleepMin, b, undefined));
    }
  }
  if (blocks.length === 0) {
    full.push(...gapBlocksAwake(wakeMin, sleepMin, undefined, undefined));
  }
  if (sleepMin < DAY_MINUTES) {
    full.push({
      title: "sleep",
      category: "life",
      location: "home",
      startMin: sleepMin,
      endMin: DAY_MINUTES,
    });
  }
  full.sort((a, b) => a.startMin - b.startMin);
  assertNoOverlaps(full);

  return full.map((b) => ({
    title: b.title,
    category: b.category === "class" ? "class" : b.category === "study" ? "study" : "life",
    starts_at: toIsoUtc(scheduleDate, b.startMin),
    ends_at: toIsoUtc(scheduleDate, b.endMin),
    schedule_date: scheduleDate,
  }));
}
