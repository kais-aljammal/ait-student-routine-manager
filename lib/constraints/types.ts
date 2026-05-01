export type FixedClassSlot = {
  name: string;
  type: string;
  location: string;
  starts_at: string;
  ends_at: string;
  days: number[];
};

export type LifeLocation = {
  name: string;
  travel_minutes_from_home: number;
};

export type TravelToTraining = {
  from_home: number | null;
  from_university: number | null;
};

export type RecurringCommitment = {
  name: string;
  days: number[];
  starts_at: string;
  duration_minutes: number;
  location: string | null;
};

export type JobCommitment = {
  workplace_name: string;
  working_days: number[];
  shift_start: string;
  shift_end: string;
  travel_minutes_from_home: number;
};

export type SocialPlan = {
  what: string;
  days: number[];
  starts_at: string;
  duration_minutes: number;
  location: "At home" | "Outside" | "Online or Call";
};

export type LifeVariables = {
  wake_up_time: string;
  hygiene_duration_minutes: number;
  eats_breakfast_at_home: boolean;
  breakfast_duration_minutes: number;
  breakfast_time: string | null;
  locations: LifeLocation[];
  transport_types: string[];
  transport_wait_minutes: number;
  lunch_time: string;
  lunch_location: string;
  dinner_time: string;
  dinner_prep: string;
  trains: boolean;
  training_types: string[];
  training_days: number[];
  training_start_time: string | null;
  training_duration_minutes: number;
  travel_to_training: TravelToTraining;
  sleep_time: string;
  sleep_hours: number;
  focus_span_minutes: number;
  study_time_preference: string;
  study_locations: string[];
  study_sessions_target: number;
  assignment_sessions_target: number;
  session_interval_targets: {
    morning_9_12: number;
    afternoon_12_17: number;
    evening_17_22: number;
  };
  hard_start_time: string | null;
  hard_stop_time: string | null;
  auto_breaks: boolean;
  meal_reminders: boolean;
  recurring_commitments: RecurringCommitment[];
  job: JobCommitment | null;
  social_plans: SocialPlan[];
};

export const WEEKDAYS: { value: number; label: string }[] = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export const defaultLifeVariables = (): LifeVariables => ({
  wake_up_time: "08:00",
  hygiene_duration_minutes: 30,
  eats_breakfast_at_home: true,
  breakfast_duration_minutes: 20,
  breakfast_time: "08:30",
  locations: [{ name: "University Campus", travel_minutes_from_home: 30 }],
  transport_types: ["Bus"],
  transport_wait_minutes: 10,
  lunch_time: "13:00",
  lunch_location: "On campus",
  dinner_time: "20:00",
  dinner_prep: "I cook it",
  trains: false,
  training_types: [],
  training_days: [],
  training_start_time: null,
  training_duration_minutes: 60,
  travel_to_training: { from_home: null, from_university: null },
  sleep_time: "23:00",
  sleep_hours: 8,
  focus_span_minutes: 45,
  study_time_preference: "Whenever there is a gap",
  study_locations: ["Home"],
  study_sessions_target: 4,
  assignment_sessions_target: 2,
  session_interval_targets: {
    morning_9_12: 2,
    afternoon_12_17: 2,
    evening_17_22: 2,
  },
  hard_start_time: null,
  hard_stop_time: null,
  auto_breaks: true,
  meal_reminders: true,
  recurring_commitments: [],
  job: null,
  social_plans: [],
});
