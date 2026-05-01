import { addDaysToDateString } from "@/lib/date";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

export function isValidScheduleDate(v: string): boolean {
  return dateRe.test(v);
}

export function getTomorrowDate(todayDate: string): string {
  return addDaysToDateString(todayDate, 1);
}

export function getDateLabel(selectedDate: string, todayDate: string): "today" | "tomorrow" | "custom" {
  if (selectedDate === todayDate) return "today";
  if (selectedDate === getTomorrowDate(todayDate)) return "tomorrow";
  return "custom";
}
