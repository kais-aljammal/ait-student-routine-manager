import type { TaskCategory } from "./generated-task";

export type TaskKind =
  | "wake_up"
  | "morning_routine"
  | "breakfast"
  | "get_ready"
  | "transportation"
  | "class"
  | "study_session"
  | "assignment"
  | "break"
  | "lunch"
  | "dinner"
  | "free_time"
  | "go_to_gym"
  | "gym"
  | "back_home"
  | "recovery"
  | "evening_wind_down"
  | "bedtime"
  | "other_life";

function containsAny(text: string, values: string[]): boolean {
  return values.some((v) => text.includes(v));
}

export function inferTaskKind(params: {
  title: string;
  category: TaskCategory;
}): TaskKind {
  const t = params.title.toLowerCase().trim();
  if (params.category === "class") {
    if (t.includes("gym")) return "gym";
    return "class";
  }
  if (params.category === "study") {
    if (containsAny(t, ["assignment", "homework", "practice"])) return "assignment";
    return "study_session";
  }
  if (t === "wake up time" || t === "sleep") return "wake_up";
  if (t === "morning routine" || t === "morning hygiene") return "morning_routine";
  if (t === "breakfast") return "breakfast";
  if (t === "get ready" || t === "pre-departure prep") return "get_ready";
  if (t === "transportation") return "transportation";
  if (t === "lunch") return "lunch";
  if (t === "dinner") return "dinner";
  if (t === "go to gym" || t === "travel to gym") return "go_to_gym";
  if (t === "gym" || t === "gym time") return "gym";
  if (t === "back home" || t === "travel back from gym") return "back_home";
  if (t === "recovery" || t === "clean up & rest") return "recovery";
  if (t === "evening wind-down") return "evening_wind_down";
  if (t === "bedtime" || t === "sleep prep") return "bedtime";
  if (t.includes("break") || t.includes("snack")) return "break";
  if (containsAny(t, ["free time", "personal time", "leisure", "review"])) return "free_time";
  return "other_life";
}

export function titleForKind(kind: TaskKind, category: TaskCategory): string {
  if (category === "class" && kind !== "gym") return "Class";
  switch (kind) {
    case "wake_up":
      return "Wake Up Time";
    case "morning_routine":
      return "Morning Routine";
    case "breakfast":
      return "Breakfast";
    case "get_ready":
      return "Get Ready";
    case "transportation":
      return "Transportation";
    case "study_session":
      return "Study Session";
    case "assignment":
      return "Assignment";
    case "break":
      return "Break";
    case "lunch":
      return "Lunch";
    case "dinner":
      return "Dinner";
    case "free_time":
      return "Free Time";
    case "go_to_gym":
      return "Go to Gym";
    case "gym":
      return "GYM";
    case "back_home":
      return "Back Home";
    case "recovery":
      return "Recovery";
    case "evening_wind_down":
      return "Evening Wind-Down";
    case "bedtime":
      return "Bedtime";
    default:
      return category === "study" ? "Study Session" : "Free Time";
  }
}
