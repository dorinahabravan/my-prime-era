
import type { PrimeProgress } from "./progress";

export type WorkoutItem = {
  type: string;
  label: string;
  duration?: number;
  youtubeUrl?: string;
};

export type WorkoutDay = {
  day: string;
  items: WorkoutItem[];
  notes?: string;
};

// Original My Prime Era DEFAULT_WEEK
export const DEFAULT_WEEK: WorkoutDay[] = [
  {
    day: "Monday",
    items: [
      { type: "strength", label: "20 min full-body with weights", duration: 20 },
      { type: "glutes", label: "10 min glutes", duration: 10 },
      { type: "cardio", label: "20 min incline treadmill", duration: 20 }
    ],
    notes: ""
  },
  {
    day: "Tuesday",
    items: [
      { type: "pilates", label: "8 min full-body Pilates", duration: 8 },
      { type: "posture", label: "15 min posture / back", duration: 15 },
      { type: "core", label: "14 min core", duration: 14 }
    ],
    notes: ""
  },
  {
    day: "Wednesday",
    items: [
      { type: "strength", label: "20 min full-body with weights", duration: 20 },
      { type: "glutes", label: "10 min glutes", duration: 10 },
      { type: "cardio", label: "20 min incline treadmill", duration: 20 }
    ],
    notes: ""
  },
  {
    day: "Thursday",
    items: [
      { type: "mobility", label: "30 min hip mobility", duration: 30 }
    ],
    notes: ""
  },
  {
    day: "Friday",
    items: [
      { type: "strength", label: "20 min full-body with weights", duration: 20 },
      { type: "glutes", label: "10 min glutes", duration: 10 },
      { type: "core", label: "14 min core", duration: 14 }
    ],
    notes: ""
  },
  {
    day: "Saturday",
    items: [
      { type: "cardio", label: "20 min incline treadmill", duration: 20 },
      { type: "posture", label: "15 min posture / back", duration: 15 }
    ],
    notes: ""
  },
  {
    day: "Sunday",
    items: [
      { type: "recovery", label: "Easy walk / recovery", duration: 20 },
      { type: "stretch", label: "Light stretching & mobility", duration: 10 }
    ],
    notes: ""
  }
];

export function getWorkoutPlan(
  progress: PrimeProgress,
  weekKey: string
): WorkoutDay[] {
  const saved = progress.plans?.[weekKey];

  if (Array.isArray(saved)) {
    return saved as WorkoutDay[];
  }

  return DEFAULT_WEEK;
}

export function isPlannedWorkout(day: WorkoutDay): boolean {
  return day.items.some(
    item => !["recovery", "stretch"].includes(item.type)
  );
}

export function getWorkoutVideo(
  progress: PrimeProgress,
  item: WorkoutItem
): string {
  const key = item.label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  const saved = progress.workoutVideos?.[key];

  return item.youtubeUrl ||
    (typeof saved === "string" ? saved : "");
}
