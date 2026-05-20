import { addDaysToDateString } from "@/lib/date";
import { isValidCalendarDate } from "@/lib/utils/date";

export function isValidScheduleDate(v: string): boolean {
  return isValidCalendarDate(v);
}

export function getTomorrowDate(todayDate: string): string {
  return addDaysToDateString(todayDate, 1);
}

export function getDateLabel(selectedDate: string, todayDate: string): "today" | "tomorrow" | "custom" {
  if (selectedDate === todayDate) return "today";
  if (selectedDate === getTomorrowDate(todayDate)) return "tomorrow";
  return "custom";
}
