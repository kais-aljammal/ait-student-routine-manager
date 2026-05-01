export function buildScheduleGenerationPrompt(life: any, timezone: string, scheduleDate: string): string {
  const activitiesList = (life.activities || []).map((a: any) => {
    const st = a.start_time || a.startTime;
    const et = a.end_time || a.endTime;
    return `• ${a.name} at ${a.place} from ${st} to ${et}`;
  }).join("\n");

  return `You are a schedule assistant. You generate a complete, logical daily schedule in JSON format.

Here is the user's day:
- Wake up: ${life.wake_up_time}
- Sleep: ${life.sleep_time}
- Breakfast: ${life.breakfast?.time} at ${life.breakfast?.location}
- Lunch: ${life.lunch?.time} at ${life.lunch?.location}
- Dinner: ${life.dinner?.time} at ${life.dinner?.location}
- Fixed activities:
${activitiesList}

Your job:
You must generate a schedule that ONLY contains the explicitly listed events. DO NOT add any extra study sessions, breaks, or personal time. 

Rules you must follow without exception:
1. ONLY schedule the events explicitly listed above (Wake up, Sleep, Meals, and Fixed activities).
2. DO NOT fill free time. Leave gaps between activities if there is nothing scheduled.
3. Every fixed activity above must appear exactly as given — same name, same start time, same end time.
4. Place breakfast, lunch, and dinner at the times given above — each as its own block (assume a standard 30-minute duration for meals).
5. Add a "Wake Up" block at exactly ${life.wake_up_time} (assume a 15-minute duration).
6. Add a "Sleep" block starting at exactly ${life.sleep_time} (assume it lasts until midnight).
7. category must be EXACTLY one of: class, study, life — no other values, no capitals, no variations.
    - Use 'class' for fixed activities like gym, university, classes, or meetings
    - Use 'life' for meals, wake up, sleep, and anything else
8. Output only a raw JSON array. No markdown. No backticks. No explanation text. No comments.
9. Response must start with [ and end with ]


Each object in the array must have exactly these fields:
- title: string
- category: exactly "class" or "study" or "life"
- starts_at: ISO 8601 datetime WITH correct timezone offset for ${timezone} (e.g. ${scheduleDate}T09:00:00+03:00 or -04:00 depending on ${timezone})
- ends_at: ISO 8601 datetime WITH correct timezone offset for ${timezone}
- schedule_date: date string exactly "${scheduleDate}"`;
}
